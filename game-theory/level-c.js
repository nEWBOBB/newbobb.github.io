// Halle 3 · Profi-Liga: Level 11 bis 15
(() => {
	"use strict";
	const A = window.Arcade;
	const { el, ri, fmt, komma, sprite, BOTS, PAY, STRATS } = A;

	// ---------- Level 11: Drohungen und Versprechen ----------
	const SCENES = [
		{ bot: "hai", title: "Der Platzhirsch",
			say: "Das ist MEIN Markt. Wenn du hier einen Laden aufmachst, starte ich einen Preiskrieg, bis du pleite bist!",
			first: [{ label: "Draußen bleiben", pay: [0, 10] }, { label: "Laden eröffnen", then: [{ label: "Preiskrieg", pay: [-3, 2] }, { label: "Markt teilen", pay: [4, 5] }] }],
			best: 1,
			why: "Die Drohung war leer. Bist du erst einmal da, bringt der Preiskrieg Hai nur 2, Teilen aber 5. Also teilt er, so laut er vorher auch gebrüllt hat." },
		{ bot: "hai", title: "Die Riesenfabrik",
			say: "Siehst du die neue Fabrik? Die läuft nur mit vollen Regalen. Wenn du kommst, MUSS ich die Preise drücken.",
			first: [{ label: "Draußen bleiben", pay: [0, 9] }, { label: "Laden eröffnen", then: [{ label: "Preiskrieg", pay: [-3, 2] }, { label: "Markt teilen", pay: [4, 1] }] }],
			best: 0,
			why: "Diesmal ist die Drohung glaubwürdig. Die teure Fabrik hat Hais eigene Zahlen verändert: Teilen bringt ihm jetzt nur noch 1, der Preiskrieg 2. Er hat sich selbst festgelegt, wie mit dem Lenkrad in Level 8." },
		{ bot: "logo", title: "Das Ehrenwort",
			say: "Leih mir 4 Münzen. Ich mache 12 daraus und gebe dir 7 zurück. Ehrenwort. Wir sehen uns danach nie wieder.",
			first: [{ label: "Nicht leihen", pay: [0, 0] }, { label: "4 Münzen leihen", then: [{ label: "Zurückzahlen", pay: [3, 5] }, { label: "Alles behalten", pay: [-4, 12] }] }],
			best: 0,
			why: "Das Versprechen ist nichts wert. Hat Logo das Geld erst einmal, bringt ihm Behalten 12 und Zurückzahlen 5. Schade für beide: Mit Vertrauen hättet ihr zusammen mehr gehabt." },
		{ bot: "logo", title: "Das Pfand",
			say: "Gleiches Geschäft. Aber diesmal hinterlege ich 9 Münzen als Pfand beim Notar. Zahle ich nicht, gehören sie dir.",
			first: [{ label: "Nicht leihen", pay: [0, 0] }, { label: "4 Münzen leihen", then: [{ label: "Zurückzahlen", pay: [3, 5] }, { label: "Alles behalten", pay: [5, 3] }] }],
			best: 1,
			why: "Jetzt ist das Versprechen glaubwürdig. Mit dem Pfand bringt Behalten Logo nur noch 3, Zurückzahlen 5. Er hat sich das Betrügen selbst teuer gemacht, und genau deshalb kommt das Geschäft zustande." },
	];
	A.add({
		id: 11,
		title: "Leere Drohung?",
		tag: "Drohungen und Versprechen",
		bots: ["hai", "logo"],
		intro: `<p>Reden ist billig. „Wenn du das machst, dann …!“ oder „Versprochen, ich zahle zurück!“ Die Frage ist immer:
			<strong>Würde er es wirklich tun</strong>, wenn es so weit ist?</p>
			<p>Vier Szenen. Jedes Mal ziehst du zuerst, danach der Bot. Der Baum zeigt alle Ausgänge. Lies ihn von hinten wie
			in Level 10 und entscheide, ob du der Ansage glaubst.</p>`,
		play(ctx) {
			let k = 0, total = 0, right = 0;
			const head = el("p.g-head");
			const box = el("div.tree");
			const log = el("div.g-log", { "aria-live": "polite" });
			ctx.root.append(head, box, log);
			draw(null);

			function leaf(name, o, path) {
				return el("div", { class: "leaf" + (path ? " path" : "") , html: `${o.label}: du <span class="me">${fmt(o.pay[0])}</span> | ${name} <span class="op">${fmt(o.pay[1])}</span>` });
			}
			function draw(chosen) {
				const S = SCENES[k], b = BOTS[S.bot];
				const botPick = (o) => (o.then[0].pay[1] >= o.then[1].pay[1] ? 0 : 1);
				head.textContent = `Szene ${k + 1} von ${SCENES.length} · ${S.title}`;
				box.innerHTML = "";
				const br = el("div.tree-br");
				S.first.forEach((o, i) => {
					const col = el("div");
					col.append(el("button.btn" + (i === 0 ? "" : ".primary"), { type: "button", text: o.label, disabled: chosen != null, "aria-pressed": chosen === i ? "true" : "false", onclick: () => choose(i) }));
					if (o.then) {
						const bp = botPick(o);
						col.append(el("div", { class: "tree-node" + (chosen === i ? " path" : "") }, el("small", { style: `color:${b.color}`, text: `DANN ENTSCHEIDET ${b.name}` }),
							el("div.tree-br", null, o.then.map((t, j) => leaf(b.name, t, chosen === i && j === bp)))));
					} else col.append(leaf(b.name, o, chosen === i));
					br.append(col);
				});
				box.append(
					el("p.tree-say", { style: `--c:${b.color}`, text: `${b.name}: „${S.say}“` }),
					el("div.tree-node", null, el("small", { style: "color:#2ff3ff", text: "DU ENTSCHEIDEST ZUERST" }), br));
			}
			function choose(i) {
				const S = SCENES[k], o = S.first[i], b = BOTS[S.bot];
				const end = o.then ? o.then[o.then[0].pay[1] >= o.then[1].pay[1] ? 0 : 1] : o;
				const ok = i === S.best;
				if (ok) {
					total += 200;
					right++;
				}
				draw(i);
				log.innerHTML = "";
				log.append(el("p", { html: `${o.then ? `${b.name} wählt „${end.label}“. ` : ""}Du bekommst <span class="me">${fmt(end.pay[0])}</span>. ${ok ? '<span class="good">Gut entschieden, +200.</span>' : '<span class="bad">Das ging besser.</span>'} ${S.why}` }));
				k++;
				if (k < SCENES.length) {
					const nb = el("button.btn.primary", { type: "button", text: "Nächste Szene →", onclick: () => { log.innerHTML = ""; draw(null); } });
					log.append(nb);
					nb.focus();
				} else {
					if (right === SCENES.length) total += 200;
					ctx.finish(total, `<p>${right} von ${SCENES.length} Ansagen richtig eingeschätzt${right === SCENES.length ? ", dazu 200 Bonuspunkte" : ""}. Der Unterschied lag nie in den Worten, sondern immer in den Zahlen am Ende des Baums.</p>`);
				}
			}
		},
		reveal: `<p>Eine Drohung oder ein Versprechen ist nur dann <strong>glaubwürdig</strong>, wenn es für den Sprecher im
			Ernstfall selbst die beste Wahl ist, es auch auszuführen. Alles andere ist Gerede, und ein kluger Mitspieler
			ignoriert es. Reinhard Selten bekam für diese Idee (das <strong>teilspielperfekte Gleichgewicht</strong>) 1994 den
			Nobelpreis, zusammen mit John Nash.</p>
			<p>Der Test ist immer derselbe: Geh im Baum an die Stelle, an der der andere entscheidet, und schau nur auf
			<em>seine</em> Zahlen. Was er dort wählt, wählt er. Egal was er vorher angekündigt hat.</p>
			<p>Wer etwas glaubwürdig machen will, muss deshalb die <strong>eigenen Zahlen ändern</strong>:</p>
			<ul><li><strong>Selbstbindung:</strong> die Fabrik bauen, das Lenkrad werfen, die Brücke abbrennen.</li>
			<li><strong>Pfand und Vertrag:</strong> den Wortbruch teuer machen, mit Kaution, Garantie oder Strafe.</li>
			<li><strong>Ruf:</strong> Wer morgen wieder Geschäfte machen will, kann es sich nicht leisten, heute zu lügen
			(Level 6 und 15).</li></ul>
			<p class="merke"><b>Merke:</b> Hör nicht darauf, was jemand ankündigt. Rechne aus, was er tun wird, wenn es so weit
			ist. Und wenn man dir glauben soll: Mach es dir selbst teuer, dein Wort zu brechen.</p>`,
		quiz: {
			q: "Wann ist eine Drohung glaubwürdig?",
			a: [
				["Wenn sie laut und entschlossen genug vorgetragen wird.", "Lautstärke ändert keine Auszahlung. Hai hat in Szene 1 gebrüllt und dann trotzdem geteilt.", false],
				["Wenn der Schaden für den Bedrohten besonders groß wäre.", "Der Schaden beim anderen sagt nichts darüber, ob der Drohende es durchzieht. Es zählt, was die Ausführung ihn selbst kostet.", false],
				["Wenn es für den Drohenden im Ernstfall selbst die bessere Wahl ist, sie auszuführen.", "Dann muss er sich nicht überwinden, er tut einfach, was für ihn am besten ist. Genau das macht die Ansage glaubhaft.", true],
			],
		},
	});

	// ---------- Level 12: Auktionen ----------
	A.add({
		id: 12,
		title: "Zum Ersten, zum Zweiten",
		tag: "Auktionen",
		bots: ["hai", "wurf", "logo"],
		intro: `<p>Ein alter Spielautomat wird versteigert, verdeckt: Jeder schreibt ein Gebot auf einen Zettel. Dir ist der
			Automat einen bestimmten Betrag <strong>wert</strong>, den nur du kennst. Dein Gewinn ist dieser Wert minus dem
			Preis, den du zahlst. Wer nicht gewinnt, zahlt nichts.</p>
			<p>Acht Auktionen gegen drei Bots. In den ersten vier zahlt der Gewinner <strong>sein eigenes Gebot</strong>. In den
			letzten vier zahlt er nur das <strong>zweithöchste Gebot</strong>. Ändert das, wie du bietest?</p>`,
		play(ctx) {
			const R = 8, ids = ["hai", "wurf", "logo"];
			let r = 0, profit = 0, honest = 0, v, vals;
			const head = el("p.g-head");
			const info = el("p");
			const out = el("output.g-big");
			const range = el("input", { type: "range", min: 0, max: 100, "aria-label": "Dein Gebot" });
			range.addEventListener("input", () => (out.textContent = range.value));
			const btn = el("button.btn.primary", { type: "button", text: "Gebot abgeben", onclick: bid });
			const log = el("div.g-log", { "aria-live": "polite" });
			const tot = el("p.g-note");
			ctx.root.append(head, info, el("div.g-row", null, range, out), btn, log, tot);
			deal();

			function deal() {
				const second = r >= 4;
				v = ri(50, 100);
				vals = ids.map(() => ri(10, 90));
				head.innerHTML = `Auktion ${r + 1} von ${R} · ${second ? '<span class="gold">Zweitpreis:</span> Der Gewinner zahlt das zweithöchste Gebot.' : '<span class="gold">Erstpreis:</span> Der Gewinner zahlt sein eigenes Gebot.'}`;
				info.innerHTML = `Der Automat ist dir <strong class="me">${v} Münzen</strong> wert. Wie viel bietest du?`;
				range.value = v;
				out.textContent = v;
				range.disabled = btn.disabled = false;
				btn.textContent = "Gebot abgeben";
			}
			function bid() {
				if (btn.dataset.next) {
					delete btn.dataset.next;
					log.innerHTML = "";
					return deal();
				}
				const second = r >= 4;
				const me = +range.value;
				const bots = ids.map((id, i) => ({ name: BOTS[id].name, color: BOTS[id].color, bid: second ? vals[i] : Math.round(vals[i] * 0.75) }));
				const all = [{ name: "Du", color: "#ffffff", bid: me, you: true }, ...bots].sort((a, b) => b.bid - a.bid || (a.you ? -1 : 1));
				const win = all[0];
				const price = second ? all[1].bid : win.bid;
				const gain = win.you ? v - price : 0;
				profit += gain;
				if (second) honest += Math.max(0, v - Math.max(...bots.map((b) => b.bid)));
				const ul = el("ol.bids");
				all.forEach((b, i) => ul.append(el("li", { class: i === 0 ? "w" : "" }, el("span", { text: b.name }), el("span", null, el("i", { style: `width:${b.bid}%;--c:${b.color}` })), el("span", { text: b.bid }))));
				log.innerHTML = "";
				log.append(ul, el("p", { html: win.you
					? `Du gewinnst und zahlst <strong>${price}</strong>. Gewinn: ${v} − ${price} = <span class="${gain >= 0 ? "good" : "bad"}">${fmt(gain)}</span>.${gain === 0 && !second ? " Wer genau seinen Wert bietet, gewinnt den Automaten, aber keine Münze." : ""}`
					: `${win.name} gewinnt und zahlt ${price}. Du gehst leer aus: Gewinn 0.${!second && v > win.bid ? ` Mit ${win.bid + 1} hättest du gewonnen und ${v - win.bid - 1} verdient.` : ""}${second && v > win.bid ? ` Mit deinem wahren Wert ${v} hättest du gewonnen und nur ${win.bid} gezahlt.` : ""}` }));
				tot.innerHTML = `Gewinn bisher: <strong>${fmt(profit)} Münzen</strong>`;
				r++;
				range.disabled = true;
				if (r === R) {
					btn.disabled = true;
					ctx.finish(profit * 10, `<p>Gesamtgewinn: <strong>${fmt(profit)} Münzen</strong>. In den vier Zweitpreis-Auktionen hätte „immer genau den eigenen Wert bieten“ <strong>${honest}</strong> gebracht. Mehr geht dort nicht, egal wie du taktierst.</p>`);
				} else {
					btn.textContent = r === 4 ? "Weiter: Jetzt gilt Zweitpreis →" : "Nächste Auktion →";
					btn.dataset.next = "1";
				}
			}
		},
		reveal: `<p>Eine Auktion ist ein Spiel, in dem jeder etwas weiß, was die anderen nicht wissen: den eigenen Wert.
			Die Regeln entscheiden, wie man klug bietet.</p>
			<p><strong>Erstpreis:</strong> Bietest du deinen wahren Wert, ist dein Gewinn immer 0. Also bietest du
			<em>weniger</em>. Je tiefer, desto mehr Gewinn, falls du gewinnst, aber desto seltener gewinnst du. Bei vier
			Bietern mit gleichmäßig verteilten Werten liegt das Gleichgewicht bei drei Vierteln des eigenen Werts. Genau so
			haben die Bots geboten.</p>
			<p><strong>Zweitpreis</strong> (Vickrey-Auktion): Hier ist <strong>ehrlich bieten dominant</strong>, wie in Level 3.
			Dein Gebot bestimmt nur, <em>ob</em> du gewinnst, nicht <em>was</em> du zahlst. Bietest du zu wenig, verpasst du
			gute Geschäfte. Bietest du zu viel, gewinnst du Auktionen, in denen du draufzahlst. Der wahre Wert ist nie
			schlechter als irgendein anderes Gebot.</p>
			<p>Das ist kluges <strong>Spieldesign</strong>: Die Regel ist so gebaut, dass Ehrlichkeit sich lohnt. Der Bietagent
			bei eBay funktioniert so (du nennst dein Maximum und zahlst nur knapp über dem Zweiten), und Suchmaschinen haben
			ihre Werbeplätze lange nach diesem Prinzip versteigert.</p>
			<p class="merke"><b>Merke:</b> Erst die Regeln lesen, dann bieten. Und wer selbst Regeln macht, kann sie so bauen,
			dass die Wahrheit für alle die beste Strategie ist.</p>`,
		quiz: {
			q: "Zweitpreis-Auktion, verdeckte Gebote. Der Gegenstand ist dir 80 wert. Was bietest du am besten?",
			a: [
				["60, damit ich weniger zahle, falls ich gewinne.", "Dein Gebot senkt den Preis nicht, den bestimmt der Zweite. Mit 60 verlierst du nur Auktionen, die du für 61 bis 79 gern gewonnen hättest.", false],
				["Genau 80.", "Du gewinnst genau dann, wenn der Preis unter deinem Wert liegt. Besser geht es nicht, egal was die anderen bieten.", true],
				["100, um sicher zu gewinnen. Ich zahle ja nur das zweite Gebot.", "Und wenn das zweite Gebot 95 ist? Dann zahlst du 95 für etwas, das dir 80 wert ist.", false],
			],
		},
	});

	// ---------- Level 13: Ultimatum und Fairness ----------
	A.add({
		id: 13,
		title: "Friss oder stirb",
		tag: "Ultimatum und Fairness",
		bots: ["logo", "groll", "hai"],
		intro: `<p>10 Münzen liegen auf dem Tisch. Einer macht <strong>ein einziges Angebot</strong>, wie sie geteilt werden.
			Der andere sagt Ja oder Nein. Bei Ja wird so geteilt. Bei Nein bekommen <strong>beide nichts</strong>. Kein
			Nachverhandeln.</p>
			<p>Erst machst du vier Bots ein Angebot. Dann bekommst du selbst drei Angebote vorgelegt.</p>`,
		play(ctx) {
			const resp = [
				{ id: "logo", min: 1, yes: "Eine Münze ist mehr als keine. Angenommen.", no: "Null ist nicht mehr als null. Abgelehnt." },
				{ id: "echo", min: 3, yes: "Damit kann ich leben.", no: "So gehst du mit mir um? Dann kriegst du auch nichts." },
				{ id: "groll", min: 4, yes: "Na gut. Gerade noch anständig.", no: "Eine Frechheit. Lieber verbrenne ich das Geld." },
				{ id: "wurf", min: ri(1, 5), yes: "Heute bin ich zufrieden.", no: "Heute nicht. Frag nicht, warum." },
			];
			const offers = [
				{ id: "hai", give: 1, yes: "Hähä. 9 für mich.", no: "Was?! Du verzichtest auf geschenktes Geld?" },
				{ id: "pawlow", give: 3, yes: "Hat geklappt. Mach ich wieder so.", no: "Autsch. Nächstes Mal biete ich mehr." },
				{ id: "engel", give: 5, yes: "Halbe-halbe, wie es sich gehört.", no: "Oh. Hab ich etwas falsch gemacht?" },
			];
			let k = 0, coins = 0;
			const head = el("p.g-head");
			const who = el("div.cast");
			const body = el("div");
			const log = el("div.g-log", { "aria-live": "polite" });
			const tot = el("p.g-note");
			ctx.root.append(head, who, body, log, tot);
			step();

			function card(id, line) {
				who.innerHTML = "";
				who.append(el("div.bot", { style: `--c:${BOTS[id].color}` }, sprite(id, 44), el("div", null, el("b", { text: BOTS[id].name }), el("span", { text: line }))));
			}
			function step() {
				body.innerHTML = "";
				if (k < resp.length) {
					const R = resp[k];
					head.textContent = `Teil 1, Angebot ${k + 1} von ${resp.length}: Wie viel von 10 Münzen bietest du?`;
					card(R.id, "Ich warte auf dein Angebot.");
					const out = el("output.g-big", { text: "3" });
					const range = el("input", { type: "range", min: 0, max: 10, value: 3, "aria-label": "Münzen, die du anbietest" });
					const cap = el("p.g-note");
					const upd = () => {
						out.textContent = range.value;
						cap.textContent = `${BOTS[R.id].name} bekäme ${range.value}, du behieltest ${10 - range.value}.`;
					};
					range.addEventListener("input", upd);
					upd();
					body.append(el("div.g-row", null, range, out), cap, el("button.btn.primary", { type: "button", text: "Angebot machen", onclick: () => {
						const x = +range.value, ok = x >= R.min;
						if (ok) coins += 10 - x;
						done(`Du bietest ${x}. ${BOTS[R.id].name}: <em>„${ok ? R.yes : R.no}“</em> ${ok ? `<span class="good">Du bekommst ${10 - x}.</span>` : '<span class="bad">Beide gehen leer aus.</span>'}`);
					} }));
				} else {
					const O = offers[k - resp.length];
					head.textContent = `Teil 2, Angebot ${k - resp.length + 1} von ${offers.length}: Nimmst du an?`;
					card(O.id, `Ich biete dir ${O.give} von 10. Ich behalte ${10 - O.give}.`);
					const fin = (ok) => {
						if (ok) coins += O.give;
						done(`${BOTS[O.id].name}: <em>„${ok ? O.yes : O.no}“</em> ${ok ? `<span class="good">Du bekommst ${O.give}.</span>` : `Beide bekommen nichts. Du hast ${O.give} ${O.give === 1 ? "Münze" : "Münzen"} bezahlt, um ${BOTS[O.id].name} ${10 - O.give} wegzunehmen.`}`);
					};
					body.append(el("div.g-btns", null,
						el("button.btn.primary", { type: "button", text: "✔ Annehmen", onclick: () => fin(true) }),
						el("button.btn.hot", { type: "button", text: "✘ Ablehnen", onclick: () => fin(false) })));
				}
			}
			function done(html) {
				body.innerHTML = "";
				log.innerHTML = `<p>${html}</p>`;
				tot.innerHTML = `Deine Münzen: <strong>${coins}</strong>`;
				k++;
				if (k < resp.length + offers.length) {
					const b = el("button.btn.primary", { type: "button", text: k === resp.length ? "Weiter: Jetzt bekommst du Angebote →" : "Weiter →", onclick: () => { log.innerHTML = ""; step(); } });
					body.append(b);
					b.focus();
				} else {
					head.textContent = "Fertig.";
					who.innerHTML = "";
					ctx.finish(Math.min(1000, coins * 28), `<p>Du hast <strong>${coins} Münzen</strong> gesammelt. Jeder Bot hatte eine andere Schmerzgrenze: Logo nimmt alles ab 1, Echo ab 3, Groll erst ab 4, bei Würfel wechselt sie.</p>`);
				}
			}
		},
		reveal: `<p>Rechne rückwärts wie in Level 10: Wer antwortet, wählt zwischen „etwas“ und „nichts“. Ein reiner Rechner wie
			Logo nimmt also <strong>jedes Angebot über 0</strong> an. Und wer das weiß, bietet genau 1 Münze. So sagt es die
			Theorie.</p>
			<p>Echte Menschen spielen anders. Seit dem ersten Experiment von Werner Güth 1982 wurde das Spiel hunderte Male
			wiederholt, rund um die Welt:</p>
			<ul><li>Die meisten bieten <strong>40 bis 50 %</strong> an.</li>
			<li>Angebote unter etwa <strong>20 bis 30 %</strong> werden oft abgelehnt, in vielen Studien etwa jedes zweite.</li>
			<li>Das gilt auch, wenn es um das Gehalt mehrerer Monate geht.</li></ul>
			<p>Menschen <strong>zahlen</strong> also dafür, Unfairness zu bestrafen. Ist das dumm? Nicht unbedingt. Wer als
			jemand bekannt ist, der schlechte Angebote ablehnt, bekommt bessere. Der Zorn wirkt wie das weggeworfene Lenkrad
			aus Level 8: eine Selbstbindung, die die Drohung „Dann eben gar nichts!“ glaubwürdig macht.</p>
			<p>Die Spieltheorie ist damit nicht widerlegt. Die Zahlen in der Matrix waren unvollständig: Menschen bewerten
			nicht nur Münzen, sondern auch <strong>Fairness</strong> und ihren <strong>Ruf</strong>.</p>
			<p class="merke"><b>Merke:</b> Rechne mit Menschen, nicht mit Rechenmaschinen. Ein Angebot, das den anderen
			demütigt, ist auch dann ein schlechtes Angebot, wenn es „logisch“ angenommen werden müsste.</p>`,
		quiz: {
			q: "Was sagt reines Rückwärtsdenken für den voraus, der im Ultimatumspiel antwortet?",
			a: [
				["Er nimmt jedes Angebot über null an, weil etwas besser ist als nichts.", "So lautet die Vorhersage für einen Spieler, den nur Münzen interessieren. Echte Menschen lehnen kleine Angebote oft ab.", true],
				["Er lehnt alles unter der Hälfte ab.", "Das wäre eine Fairnessregel. Reines Rechnen kennt keine Fairness, nur „mehr“ oder „weniger“.", false],
				["Er wirft eine Münze.", "Zufall hilft hier nicht: Annehmen bringt immer mehr Münzen als Ablehnen.", false],
			],
		},
	});

	// ---------- Level 14: Evolution der Kooperation ----------
	const POOL = ["echo", "goenner", "pawlow", "groll", "engel", "hai", "wurf"];
	function match(fa, fb, noise, rounds) {
		const ha = [], hb = [];
		let sa = 0, sb = 0;
		const flip = (m) => (Math.random() < noise ? (m === "C" ? "D" : "C") : m);
		for (let i = 0; i < rounds; i++) {
			const x = flip(fa(ha, hb)), y = flip(fb(hb, ha));
			ha.push(x);
			hb.push(y);
			sa += PAY[x + y][0];
			sb += PAY[x + y][1];
		}
		return [sa / rounds, sb / rounds];
	}
	A.add({
		id: 14,
		title: "Das große Turnier",
		tag: "Evolution der Kooperation",
		bots: ["echo", "goenner", "hai"],
		intro: `<p>1980 lud der Politologe Robert Axelrod Forscher aus aller Welt ein, Programme für das wiederholte
			Gefangenendilemma einzuschicken. Jedes spielte gegen jedes, 200 Runden lang. Die Frage: Welche Strategie holt am
			Ende die meisten Punkte?</p>
			<p>Jetzt bist du dran. <strong>Bau deinen eigenen Bot</strong> aus vier Schaltern und schick ihn ins Turnier gegen
			alle sieben Bots der Halle. Je weiter vorn er landet, desto mehr Punkte.</p>`,
		play(ctx) {
			const cfg = { first: "C", onD: "hit", forgive: "yes", sneak: "no" };
			const Q = [
				["first", "Erster Zug", [["C", "🤝 Nett anfangen"], ["D", "🗡 Mit Betrug anfangen"]]],
				["onD", "Wenn der andere mich betrügt", [["hit", "Zurückschlagen"], ["take", "Hinnehmen"]]],
				["forgive", "Wenn er danach wieder nett ist", [["yes", "Vergeben"], ["never", "Nie vergeben"]]],
				["sneak", "Ab und zu grundlos betrügen (jede 10. Runde)", [["no", "Nein"], ["yes", "Ja, heimlich"]]],
			];
			const build = el("div.build");
			Q.forEach(([key, legend, opts]) => {
				const row = el("div.g-btns");
				opts.forEach(([val, label]) => row.append(el("button.btn", { type: "button", text: label, "aria-pressed": cfg[key] === val ? "true" : "false", onclick: (e) => {
					cfg[key] = val;
					[...row.children].forEach((b) => b.setAttribute("aria-pressed", b === e.currentTarget ? "true" : "false"));
				} })));
				build.append(el("fieldset", null, el("legend", { text: legend }), row));
			});
			const nOut = el("output.g-big", { text: "0 %" });
			const noise = el("input", { type: "range", min: 0, max: 10, value: 0, "aria-label": "Missverständnisse in Prozent" });
			noise.addEventListener("input", () => (nOut.textContent = noise.value + " %"));
			const list = el("ol.rank");
			const log = el("div.g-log", { "aria-live": "polite" });
			const evoBox = el("div");
			ctx.root.append(el("p.g-head", { text: "Dein Bot:" }), build,
				el("p.g-note", { text: "Missverständnisse: Wie oft kommt ein Zug falsch an? (Ein Nett wird als Betrug verstanden oder umgekehrt.)" }),
				el("div.g-row", null, noise, nOut),
				el("button.btn.primary", { type: "button", text: "🏆 Turnier starten", onclick: run }), list, log, evoBox);
			let timer;

			function myBot(me, op) {
				if (cfg.sneak === "yes" && Math.random() < 0.1) return "D";
				if (!op.length) return cfg.first;
				if (cfg.onD === "take") return "C";
				if (cfg.forgive === "never") return op.includes("D") ? "D" : "C";
				return op[op.length - 1] === "D" ? "D" : "C";
			}
			function run() {
				clearInterval(timer);
				const p = +noise.value / 100;
				const P = [{ name: "DEIN BOT", color: "#ffffff", f: myBot, you: true }, ...POOL.map((id) => ({ name: BOTS[id].name, color: BOTS[id].color, f: STRATS[id] }))];
				const n = P.length, M = P.map(() => Array(n).fill(0)), reps = 4;
				for (let i = 0; i < n; i++) for (let j = i; j < n; j++) for (let r = 0; r < reps; r++) {
					const [a, b] = match(P[i].f, P[j].f, p, 200);
					M[i][j] += a / reps;
					if (i !== j) M[j][i] += b / reps;
				}
				const score = P.map((_, i) => M[i].reduce((s, x) => s + x, 0) / n);
				const order = P.map((_, i) => i).sort((a, b) => score[b] - score[a]);
				const rank = order.indexOf(0) + 1;
				list.innerHTML = "";
				order.forEach((i) => list.append(el("li", { class: P[i].you ? "you" : "" }, el("span", { text: P[i].name }),
					el("span", null, el("i", { style: `width:${Math.min(100, score[i] / 3.2 * 100)}%;--c:${P[i].color}` })), el("span", { text: komma(score[i], 2) }))));
				log.innerHTML = `<p>Durchschnittliche Punkte pro Runde gegen alle (und gegen sich selbst). Dein Bot landet auf <strong>Platz ${rank} von ${n}</strong>.</p>`;
				// Evolution: erfolgreiche Strategien vermehren sich
				evoBox.innerHTML = "";
				const bar = el("div.evo", { "aria-hidden": "true" });
				const segs = P.map((b) => el("i", { style: `--c:${b.color};width:${100 / n}%`, title: b.name }));
				bar.append(...segs);
				const cap = el("p.g-note", { "aria-live": "polite" });
				evoBox.append(el("p.g-head", { text: "Und wenn Erfolg sich vermehrt?" }),
					el("p.g-note", { text: "Stell dir eine Bevölkerung vor, in der jede Strategie anfangs gleich oft vorkommt. Wer viele Punkte holt, bekommt in der nächsten Generation mehr Nachkommen." }),
					el("button.btn", { type: "button", text: "🧬 60 Generationen laufen lassen", onclick: evolve }), bar, cap);
				function evolve() {
					clearInterval(timer);
					let s = Array(n).fill(1 / n), g = 0;
					const tick = () => {
						const f = s.map((_, i) => M[i].reduce((a, x, j) => a + x * s[j], 0));
						const avg = f.reduce((a, x, i) => a + x * s[i], 0);
						s = s.map((x, i) => x * f[i] / avg);
						g++;
					};
					const show = () => {
						segs.forEach((sg, i) => (sg.style.width = s[i] * 100 + "%"));
						const top = s.map((x, i) => [x, P[i].name]).sort((a, b) => b[0] - a[0]).filter((t) => t[0] >= 0.02).slice(0, 3);
						cap.textContent = `Generation ${g}: ` + top.map((t) => `${t[1]} ${Math.round(t[0] * 100)} %`).join(" · ");
					};
					if (A.reduce) {
						while (g < 60) tick();
						return show();
					}
					timer = setInterval(() => {
						if (!bar.isConnected || g >= 60) return clearInterval(timer);
						tick();
						show();
					}, 110);
				}
				ctx.finish(1000 - 115 * (rank - 1), `<p>Platz ${rank}. ${rank <= 2 ? "Stark gebaut." : "Probier andere Schalter aus."} Dreh auch mal die Missverständnisse auf 5 % und starte neu: Dann geraten Bots, die nie vergeben, in endlose Racheketten.</p>`);
			}
		},
		reveal: `<p>Axelrods Turnier gewann das kürzeste Programm von allen: <strong>Tit for Tat</strong>, hier Echo. Im ersten
			Zug kooperieren, danach immer den letzten Zug des anderen nachmachen. Es gewann auch das zweite Turnier, obwohl
			alle Teilnehmer das Ergebnis des ersten kannten.</p>
			<p>Axelrod fand vier Eigenschaften, die erfolgreiche Strategien teilen:</p>
			<ul><li><strong>Freundlich:</strong> nie als Erster betrügen.</li>
			<li><strong>Wehrhaft:</strong> Betrug sofort beantworten, sonst wird man ausgenommen wie Engel.</li>
			<li><strong>Versöhnlich:</strong> wieder kooperieren, sobald der andere es tut. Sonst endet man wie Groll.</li>
			<li><strong>Durchschaubar:</strong> so klar spielen, dass der andere merkt, dass Kooperation sich lohnt.</li></ul>
			<p>Bemerkenswert: Echo gewinnt <strong>kein einziges Duell</strong>. Es holt nie mehr Punkte als sein Gegenüber.
			Es gewinnt das Turnier, weil es mit vielen gut auskommt, während die Haie sich gegenseitig zerfleischen.</p>
			<p>Zwei Einschränkungen: Wer gewinnt, hängt davon ab, <strong>wer sonst mitspielt</strong>. Und sobald
			Missverständnisse vorkommen, schaukeln sich strenge Strategien in Racheketten hoch. Dann liegen großzügige
			Varianten vorn (Gönner, Pawlow), wie Martin Nowak und Karl Sigmund in den 1990er-Jahren zeigten.</p>
			<p>Die Evolution macht daraus mehr als ein Spiel: Kooperation braucht keinen guten Willen und keinen Aufpasser. Es
			reicht, dass man sich wiedersieht und dass Erfolg sich vermehrt.</p>
			<p class="merke"><b>Merke:</b> Nett, aber nicht naiv. Und vergeben können, weil Fehler passieren.</p>`,
		quiz: {
			q: "Welche vier Eigenschaften haben erfolgreiche Strategien laut Axelrod?",
			a: [
				["Misstrauisch, nachtragend, geheimnisvoll, schnell.", "Das beschreibt eher Groll und Hai. Beide landen im Turnier selten vorn.", false],
				["Freundlich, wehrhaft, versöhnlich, durchschaubar.", "Nie zuerst betrügen, Betrug beantworten, danach vergeben, und so klar spielen, dass der andere es versteht.", true],
				["Immer nett, immer nachgiebig, immer großzügig, immer geduldig.", "Das ist Engel. Wer sich nie wehrt, lädt andere dazu ein, ihn auszunutzen.", false],
			],
		},
	});

	// ---------- Level 15: Lange Spiele mit langen Partnern ----------
	A.add({
		id: 15,
		title: "Das lange Spiel",
		tag: "Lange Spiele mit langen Partnern (Naval)",
		bots: ["groll"],
		intro: `<p>Das letzte Level bringt alles zusammen. Du triffst drei Geschäftspartner. Alle spielen wie Groll: fair,
			solange du fair bist, und nach einem Betrug für immer verschlossen. Der einzige Unterschied ist, wie
			wahrscheinlich ihr euch <strong>nach jeder Runde wiederseht</strong>.</p>
			<p>Für jeden Partner legst du deine Linie fest: <strong>treu bleiben</strong> (jede Runde 3 Münzen) oder
			<strong>abzocken</strong> (einmal 5, danach nur noch 1 pro Runde). Stell erst im Labor die Wahrscheinlichkeit ein
			und sieh dir an, was sich wann lohnt.</p>`,
		play(ctx) {
			const loyal = (d) => 3 / (1 - d), cheat = (d) => 5 + d / (1 - d);
			// Labor
			const dOut = el("output.g-big");
			const range = el("input", { type: "range", min: 0, max: 95, step: 5, value: 30, "aria-label": "Wahrscheinlichkeit des Wiedersehens in Prozent" });
			const bL = el("i", { style: "--c:#5dff8f" }), bC = el("i", { style: "--c:#ff6b7d" });
			const vL = el("span"), vC = el("span");
			const cap = el("p.g-note");
			const lab = () => {
				const d = +range.value / 100, a = loyal(d), b = cheat(d);
				dOut.textContent = range.value + " %";
				bL.style.width = Math.min(100, a / 60 * 100) + "%";
				bC.style.width = Math.min(100, b / 60 * 100) + "%";
				vL.textContent = komma(a);
				vC.textContent = komma(b);
				cap.innerHTML = `Im Schnitt trefft ihr euch <strong>${komma(1 / (1 - d))}</strong>-mal. ${Math.abs(a - b) < 1e-9 ? "Genau hier kippt es: Beide Wege bringen gleich viel." : a > b ? '<span class="good">Treue bringt mehr.</span>' : '<span class="bad">Abzocken bringt mehr.</span>'}`;
			};
			range.addEventListener("input", lab);
			// Spiel
			const partners = [
				{ id: "wurf", who: "Der Tourist am Bahnhof", d: 0.2 },
				{ id: "echo", who: "Die Stammkundin", d: 0.6 },
				{ id: "groll", who: "Der Partner fürs Leben", d: 0.9 },
			];
			let k = 0, total = 0, right = 0, coins = 0;
			const head = el("p.g-head");
			const who = el("div.cast");
			const btns = el("div.g-btns");
			const log = el("div.g-log", { "aria-live": "polite" });
			ctx.root.append(el("p.g-head", { text: "Labor: Wie wahrscheinlich seht ihr euch wieder?" }), el("div.g-row", null, range, dOut),
				el("div.bars2", null, el("div", null, el("span", { text: "Treu bleiben" }), el("span", null, bL), vL), el("div", null, el("span", { text: "Abzocken" }), el("span", null, bC), vC)),
				cap, el("hr", { style: "border-color:#3a2d7a;margin:20px 0" }), head, who, btns, log);
			lab();
			meet();

			function meet() {
				const P = partners[k];
				head.textContent = `Partner ${k + 1} von 3: Welche Linie fährst du?`;
				who.innerHTML = "";
				who.append(el("div.bot", { style: `--c:${BOTS[P.id].color}` }, sprite(P.id, 44),
					el("div", null, el("b", { text: P.who.toUpperCase() }), el("span", { text: `Nach jeder Runde seht ihr euch mit ${Math.round(P.d * 100)} % Wahrscheinlichkeit wieder.` }))));
				btns.innerHTML = "";
				btns.append(
					el("button.btn.primary", { type: "button", text: "🤝 Treu bleiben", onclick: () => go(true) }),
					el("button.btn.hot", { type: "button", text: "🗡 Abzocken", onclick: () => go(false) }));
			}
			function go(isLoyal) {
				const P = partners[k];
				let n = 1;
				while (Math.random() < P.d && n < 80) n++;
				const got = isLoyal ? 3 * n : 5 + (n - 1);
				coins += got;
				const a = loyal(P.d), b = cheat(P.d);
				const ok = isLoyal === a > b;
				if (ok) {
					total += 300;
					right++;
				}
				log.innerHTML = `<p>Ihr habt euch <strong>${n}-mal</strong> getroffen. Du hast <strong>${got} Münzen</strong> verdient. ${ok ? '<span class="good">Kluge Linie, +300.</span>' : '<span class="bad">Die andere Linie wäre besser gewesen.</span>'} Im Schnitt bringt Treue hier ${komma(a)}, Abzocken ${komma(b)}.</p>`;
				k++;
				btns.innerHTML = "";
				if (k < partners.length) {
					const nb = el("button.btn.primary", { type: "button", text: "Nächster Partner →", onclick: () => { log.innerHTML = ""; meet(); } });
					btns.append(nb);
					nb.focus();
				} else {
					head.textContent = "Fertig.";
					if (right === 3) total += 100;
					ctx.finish(total, `<p>${coins} Münzen aus drei Partnerschaften. Vergleich die Größenordnungen: Beim Touristen ging es um rund 5 Münzen, beim Partner fürs Leben um 30. <strong>Das große Geld liegt im langen Spiel</strong>, und dort gewinnt die Treue.</p>`);
				}
			}
		},
		reveal: `<p>Die Rechnung hinter dem Labor: Seht ihr euch nach jeder Runde mit Wahrscheinlichkeit <em>w</em> wieder, dann
			bringt Treue im Schnitt 3 ÷ (1 − <em>w</em>) Münzen. Abzocken bringt einmal 5 und danach nur noch 1 pro Runde.
			Beides ist gleich bei <em>w</em> = ½. <strong>Darüber ist Treue reiner Eigennutz.</strong> Darunter lohnt sich der
			Betrug, wie beim einmaligen Spiel in Level 5.</p>
			<p>Das ist der Kern eines berühmten Ergebnisses der Spieltheorie (des „Folk-Theorems“): Ist die Zukunft wichtig
			genug, kann Kooperation ein Gleichgewicht sein, ganz ohne Vertrag und ohne Polizei.</p>
			<p>Naval Ravikant macht daraus eine Lebensregel: <strong>„Play long-term games with long-term people.“</strong> Du
			kannst dir das Spiel aussuchen. Wer ständig mit Fremden um einmalige Geschäfte feilscht, lebt in Level 5. Wer
			sich Menschen und Felder sucht, in denen man sich immer wiedersieht, lebt in Level 15. Dort wächst Vertrauen wie
			Zinseszins: Jede faire Runde macht die nächste leichter, schneller und größer.</p>
			<p>Und damit hast du die ganze Halle gesehen:</p>
			<ul><li>Dein Ergebnis hängt von anderen ab, also denk mit ihren Köpfen (Level 1 und 2).</li>
			<li>Streich, was nie gut ist, und such, wo keiner mehr weg will (Level 3 und 4).</li>
			<li>Einzeln klug kann gemeinsam dumm sein. Wiederholung, Ruf und Selbstbindung ändern das (Level 5, 6, 8, 11).</li>
			<li>Manchmal ist Abstimmung alles, manchmal Unberechenbarkeit (Level 7 und 9).</li>
			<li>Denk vom Ende her und lies die Regeln, bevor du spielst (Level 10 und 12).</li>
			<li>Menschen sind keine Rechenmaschinen, und Fairness gehört zur Auszahlung (Level 13).</li>
			<li>Nett, wehrhaft, versöhnlich, durchschaubar: Das gewinnt auf lange Sicht (Level 14).</li></ul>
			<p class="merke"><b>Merke:</b> Such dir lange Spiele mit Menschen, die auch lange spielen. Dann ist Anstand keine
			Schwäche, sondern die Strategie mit der höchsten Rendite.</p>`,
		quiz: {
			q: "Wann lohnt es sich rein rechnerisch, einem nachtragenden Partner treu zu bleiben?",
			a: [
				["Nie. Betrügen bringt in jeder einzelnen Runde mehr.", "In der einzelnen Runde stimmt das. Aber der Betrug kostet alle späteren Runden, und die zählen mit.", false],
				["Immer, egal wie oft man sich wiedersieht.", "Beim Touristen am Bahnhof lohnte sich Abzocken. Ohne Zukunft gibt es nichts, was die Treue belohnt.", false],
				["Wenn die Wahrscheinlichkeit, sich wiederzusehen, hoch genug ist (hier über 50 %).", "Dann wiegen die künftigen 3er die einmalige 5 auf. Darum: lange Spiele mit langen Partnern.", true],
			],
		},
	});
})();
