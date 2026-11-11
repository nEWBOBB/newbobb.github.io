// AI Learning Lab · kleiner Markdown-Leser für die Inhalte in content/.
// Kein Build-Schritt: Module sind Markdown mit Metadaten und werden im Browser gelesen.
window.LabMd = (() => {
	"use strict";

	const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

	// Fett, kursiv, Code und Links innerhalb einer Zeile
	function inline(text) {
		const codes = [];
		let s = esc(text).replace(/`([^`]+)`/g, (m, c) => {
			codes.push(c);
			return `\u0001${codes.length - 1}\u0001`;
		});
		s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
		s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => {
			if (!/^(https?:\/\/|#|\.{0,2}\/)/.test(u)) return t;
			const ext = /^https?:/.test(u) ? ' target="_blank" rel="noopener"' : "";
			return `<a href="${u}"${ext}>${t}</a>`;
		});
		return s.replace(/\u0001(\d+)\u0001/g, (m, i) => `<code>${codes[i]}</code>`);
	}

	// Metadaten am Dateianfang: einfache Schlüssel-Wert-Zeilen, Listen in [a, b]
	function frontmatter(quelle) {
		const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(quelle);
		if (!m) return { meta: {}, text: quelle };
		const meta = {};
		for (const zeile of m[1].split(/\r?\n/)) {
			const z = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(zeile);
			if (!z) continue;
			let v = z[2].trim();
			if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean);
			else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
			meta[z[1]] = v;
		}
		return { meta, text: quelle.slice(m[0].length) };
	}

	// Teilt einen Text an Überschriften einer Ebene ("## " oder "### "), Code-Blöcke bleiben unberührt
	function abschnitte(text, ebene = 2) {
		const marke = "#".repeat(ebene) + " ";
		const teile = [];
		let akt = { titel: "", zeilen: [] };
		let imCode = false;
		for (const zeile of text.split(/\r?\n/)) {
			if (/^```/.test(zeile)) imCode = !imCode;
			if (!imCode && zeile.startsWith(marke)) {
				teile.push(akt);
				akt = { titel: zeile.slice(marke.length).trim(), zeilen: [] };
			} else akt.zeilen.push(zeile);
		}
		teile.push(akt);
		return teile.map((t) => ({ titel: t.titel, text: t.zeilen.join("\n").trim() })).filter((t) => t.titel || t.text);
	}

	// Diagramme: "fluss: A -> B -> C" oder "schleife: A -> B -> C" (optional "mitte: Text")
	function diagramm(text) {
		const zeilen = text.split(/\r?\n/).map((z) => z.trim()).filter(Boolean);
		let html = "";
		let mitte = "";
		for (const z of zeilen) {
			const m = /^(\w+):\s*(.*)$/.exec(z);
			if (!m) continue;
			if (m[1] === "mitte") mitte = m[2];
		}
		for (const z of zeilen) {
			const m = /^(\w+):\s*(.*)$/.exec(z);
			if (!m) continue;
			const knoten = m[2].split("->").map((k) => k.trim()).filter(Boolean);
			if (m[1] === "fluss") {
				html += `<ol class="dia-fluss">${knoten.map((k) => `<li>${inline(k)}</li>`).join("")}</ol>`;
			} else if (m[1] === "schleife") {
				const n = knoten.length;
				const items = knoten
					.map((k, i) => {
						const w = (i / n) * Math.PI * 2 - Math.PI / 2;
						const x = 50 + Math.cos(w) * 36;
						const y = 50 + Math.sin(w) * 36;
						return `<li style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%"><b>${i + 1}</b>${inline(k)}</li>`;
					})
					.join("");
				html += `<div class="dia-schleife" role="group" aria-label="Kreislauf mit ${n} Schritten">
					<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="36" /><path d="M50 14l-3.2-2.6M50 14l-3.2 2.6M86 50l2.6-3.2M86 50l-2.6-3.2M50 86l3.2 2.6M50 86l3.2-2.6M14 50l-2.6 3.2M14 50l2.6 3.2" /></svg>
					<ol>${items}</ol>${mitte ? `<span class="dia-mitte">${inline(mitte)}</span>` : ""}</div>`;
			}
		}
		return html;
	}

	// Vorher-nachher-Beispiel: Zeilen mit "vorher:" und "nachher:"
	function vergleich(text) {
		const teile = { vorher: [], nachher: [] };
		let akt = null;
		for (const zeile of text.split(/\r?\n/)) {
			const m = /^(vorher|nachher):\s*(.*)$/.exec(zeile);
			if (m) {
				akt = m[1];
				teile[akt].push(m[2]);
			} else if (akt) teile[akt].push(zeile);
		}
		const feld = (k, name) => `<div class="vgl-${k}"><span>${name}</span>${render(teile[k].join("\n")).html}</div>`;
		return `<div class="vgl">${feld("vorher", "Vorher")}${feld("nachher", "Nachher")}</div>`;
	}

	// Blöcke: Absätze, Listen, Tabellen, Zitate, Code. Besondere Code-Blöcke (uebung) werden als Slots zurückgegeben.
	function render(text) {
		const zeilen = String(text).split(/\r?\n/);
		const out = [];
		const slots = [];
		let i = 0;
		const istBlockstart = (z) => /^(```|[-*] |\d+\. |> |\|)/.test(z) || /^#{3,4} /.test(z);
		while (i < zeilen.length) {
			const z = zeilen[i];
			if (!z.trim()) {
				i++;
				continue;
			}
			if (/^```/.test(z)) {
				const sprache = z.slice(3).trim();
				const code = [];
				i++;
				while (i < zeilen.length && !/^```/.test(zeilen[i])) code.push(zeilen[i++]);
				i++;
				const inhalt = code.join("\n");
				if (sprache === "diagramm") out.push(diagramm(inhalt));
				else if (sprache === "vergleich") out.push(vergleich(inhalt));
				else if (sprache === "uebung") {
					slots.push(inhalt);
					out.push(`<div class="uebung" data-slot="${slots.length - 1}"></div>`);
				} else out.push(`<pre class="code" tabindex="0"${sprache ? ` data-sprache="${esc(sprache)}"` : ""}><code>${esc(inhalt)}</code></pre>`);
				continue;
			}
			const kopf = /^(#{3,4}) (.*)$/.exec(z);
			if (kopf) {
				out.push(`<h${kopf[1].length}>${inline(kopf[2])}</h${kopf[1].length}>`);
				i++;
				continue;
			}
			if (/^[-*] /.test(z) || /^\d+\. /.test(z)) {
				const geordnet = /^\d+\. /.test(z);
				const re = geordnet ? /^\d+\. (.*)$/ : /^[-*] (.*)$/;
				const items = [];
				while (i < zeilen.length && (re.test(zeilen[i]) || (/^\s{2,}\S/.test(zeilen[i]) && items.length))) {
					const m = re.exec(zeilen[i]);
					if (m) items.push(m[1]);
					else items[items.length - 1] += " " + zeilen[i].trim();
					i++;
				}
				const tag = geordnet ? "ol" : "ul";
				out.push(`<${tag}>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</${tag}>`);
				continue;
			}
			if (/^> /.test(z)) {
				const teil = [];
				while (i < zeilen.length && /^> ?/.test(zeilen[i]) && zeilen[i].trim()) teil.push(zeilen[i++].replace(/^> ?/, ""));
				out.push(`<aside class="merke">${teil.map((t) => `<p>${inline(t)}</p>`).join("")}</aside>`);
				continue;
			}
			if (/^\|/.test(z) && i + 1 < zeilen.length && /^\|[\s:|-]+\|?$/.test(zeilen[i + 1])) {
				const zelle = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
				const kopfzeile = zelle(z);
				i += 2;
				const reihen = [];
				while (i < zeilen.length && /^\|/.test(zeilen[i])) reihen.push(zelle(zeilen[i++]));
				out.push(
					`<div class="tabelle"><table><thead><tr>${kopfzeile.map((c) => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead><tbody>${reihen
						.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
						.join("")}</tbody></table></div>`,
				);
				continue;
			}
			const absatz = [];
			while (i < zeilen.length && zeilen[i].trim() && !istBlockstart(zeilen[i])) absatz.push(zeilen[i++].trim());
			out.push(`<p>${inline(absatz.join(" "))}</p>`);
		}
		return { html: out.join("\n"), slots };
	}

	// Ein ganzes Modul: Metadaten plus Abschnitte der Ebene 2
	function modul(quelle) {
		const { meta, text } = frontmatter(quelle);
		return { meta, abschnitte: abschnitte(text, 2).filter((a) => a.titel) };
	}

	return { esc, inline, render, frontmatter, abschnitte, modul };
})();
