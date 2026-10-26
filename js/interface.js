/* WealthMorand — formats, petits composants et graphique en lignes : montants, pastilles,
   rangées, contrôles segmentés, tableaux, graphique avec réticule. Ils ne connaissent pas
   les données de l'utilisateur : app.js leur passe ce qu'il faut afficher. */
(function () {
  "use strict";
  const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];

  /* ---------- Formats ---------- */
  const fmt$ = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
  const fmt$2 = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const $ = v => fmt$.format(isFinite(v) ? v : 0);
  const $2 = v => fmt$2.format(isFinite(v) ? v : 0);
  const nb = (v, d = 1) => new Intl.NumberFormat("fr-CA", { maximumFractionDigits: d }).format(isFinite(v) ? v : 0);
  const pct = (v, d = 1) => nb(v * 100, d) + " %";
  const signe = v => (v >= 0 ? "+" : "−") + $(Math.abs(v));
  const k$ = v => nb(v / 1000, 0) + " k$";
  const texteDe = x => typeof x === "function" ? x() : x;
  const moisAn = d => d ? d.toLocaleDateString("fr-CA", { month: "long", year: "numeric" }) : "jamais";
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };

  /* ============================================================
     PETITS COMPOSANTS
     ============================================================ */
  const NS = "http://www.w3.org/2000/svg";
  const ICONES = {
    chevron: '<path d="m9 6 6 6-6 6"/>',
    haut: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    bas: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    alerte: '<path d="M12 7v6M12 16.5h.01"/>',
    info: '<path d="M12 11v6M12 7.5h.01"/>',
    ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  };
  function icone(nom, cls) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    if (cls) s.setAttribute("class", cls);
    s.innerHTML = ICONES[nom];
    return s;
  }
  // Le chiffre principal d'une page, avec une ligne de contexte en dessous.
  const mouvement = () => !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  function hero(id, etiquette, valeur, sous, nombre) {
    const h = document.getElementById(id); h.textContent = "";
    const v = el("div", "hero-valeur", valeur);
    h.append(el("div", "hero-etiquette", etiquette), v);
    // Quand le montant change, il glisse de l'ancienne valeur à la nouvelle (450 ms).
    if (nombre !== undefined) {
      const avant = parseFloat(h.dataset.nombre);
      h.dataset.nombre = nombre;
      if (isFinite(avant) && Math.abs(avant - nombre) >= 1 && mouvement()) {
        const t0 = performance.now();
        const pas = now => {
          if (!v.isConnected) return;
          const k = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - k, 3);
          v.textContent = $(avant + (nombre - avant) * e);
          if (k < 1) requestAnimationFrame(pas);
        };
        requestAnimationFrame(pas);
      }
    }
    const s = el("div", "hero-sous");
    (sous || []).filter(Boolean).forEach(x => s.appendChild(typeof x === "string" ? el("span", null, x) : x));
    if (s.childNodes.length) h.appendChild(s);
    return h;
  }
  // Pastille : flèche selon le sens, vert si c'est une bonne nouvelle, rouge sinon.
  function puce(texte, sens, bon) {
    const p = el("span", "puce" + (bon === true ? " bon" : bon === false ? " mauvais" : ""));
    if (sens) p.appendChild(icone(sens));
    p.appendChild(document.createTextNode(texte));
    return p;
  }
  // Une rangée de liste : pastille de couleur ou icône, titre, sous-titre, valeur ; un chevron si on peut la toucher.
  function rangee(o) {
    const r = el(o.action ? "button" : "div", "rangee" + (o.cls ? " " + o.cls : ""));
    if (o.action) { r.type = "button"; r.addEventListener("click", o.action); }
    if (o.date) {
      const dt = el("span", "rangee-date");
      dt.append(el("span", "jour", String(o.date.getDate())), el("span", "mois", o.date.toLocaleDateString("fr-CA", { month: "short" }).replace(".", "")));
      r.appendChild(dt);
    } else if (o.jalon) {
      const dt = el("span", "rangee-date jalon");
      dt.append(el("span", "mois", o.jalon.mois || ""), el("span", "jour", String(o.jalon.annee)));
      r.appendChild(dt);
    } else if (o.couleur || o.ico) {
      const i = el("span", "rangee-ico" + (o.couleur ? " couleur" : ""));
      if (o.couleur) { const k = el("i"); k.style.background = o.couleur; i.appendChild(k); }
      else if (ICONES[o.ico]) i.appendChild(icone(o.ico));
      else i.textContent = o.ico;
      r.appendChild(i);
    }
    const t = el("span", "rangee-texte");
    t.appendChild(el("span", "rangee-titre", o.titre));
    if (o.sous) t.appendChild(el("span", "rangee-sous", o.sous));
    r.appendChild(t);
    if (o.valeur !== undefined) {
      const d = el("span", "rangee-droite");
      d.appendChild(el("span", "rangee-valeur" + (o.valeurCls ? " " + o.valeurCls : ""), o.valeur));
      if (o.valeurSous) d.appendChild(el("span", "rangee-valeur-sous", o.valeurSous));
      r.appendChild(d);
    }
    if (o.action) r.appendChild(icone("chevron", "chevron"));
    return r;
  }
  function rangees(cible, liste) {
    const c = typeof cible === "string" ? document.getElementById(cible) : cible;
    c.textContent = ""; c.classList.add("rangees");
    liste.filter(Boolean).forEach(x => c.appendChild(rangee(x)));
    return c;
  }
  // Contrôle segmenté (boutons radio) ; garde les mêmes boutons d'un rendu à l'autre pour ne pas perdre le focus.
  function segment(id, options, valeur, surChoix, etiquette) {
    const c = document.getElementById(id);
    const cle = options.map(o => o.join(":")).join("|");
    if (c.dataset.cle !== cle) {
      c.textContent = ""; c.dataset.cle = cle;
      c.setAttribute("role", "radiogroup"); c.setAttribute("aria-label", etiquette);
      options.forEach(([v, t]) => { const b = el("button", null, t); b.type = "button"; b.setAttribute("role", "radio"); b.dataset.v = v; c.appendChild(b); });
      c.onclick = e => { const b = e.target.closest("button"); if (b) c.surChoix(b.dataset.v); };
      c.onkeydown = e => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const bs = [...c.querySelectorAll("button")], i = bs.findIndex(b => b.getAttribute("aria-checked") === "true");
        const j = (i + (e.key === "ArrowRight" ? 1 : -1) + bs.length) % bs.length;
        e.preventDefault(); c.surChoix(bs[j].dataset.v); bs[j].focus();
      };
    }
    c.surChoix = surChoix;
    c.querySelectorAll("button").forEach(b => { const on = b.dataset.v === valeur; b.setAttribute("aria-checked", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; });
  }
  function tableauSimple(parent, entetes, lignesT) {
    const t = el("table", "tableau"); lignes(t, entetes, lignesT);
    const w = el("div", "tableau-defile"); w.appendChild(t); parent.appendChild(w); return t;
  }
  function lignes(table, entetes, rangeesT) {
    table.textContent = "";
    if (entetes) { const th = el("thead"); const tr = el("tr"); entetes.forEach(h => tr.appendChild(el("th", null, h))); th.appendChild(tr); table.appendChild(th); }
    const tb = el("tbody");
    rangeesT.forEach(r => { const tr = el("tr", r.cls || null); r.cellules.forEach((c, i) => tr.appendChild(el("td", r.classes && r.classes[i] || null, c))); tb.appendChild(tr); });
    table.appendChild(tb);
  }
  const moins = v => $(v > 0.5 ? -v : 0);  // évite « -0 $ »
  const signePct = v => (v >= 0 ? "+" : "−") + nb(Math.abs(v), 1) + "\u00a0%";

  /* ============================================================
     GRAPHIQUE EN LIGNES : réticule, et bulle ou chiffre principal qui suit
     ============================================================ */
  function pasJoli(x) {
    if (x <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(x))), n = x / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function graphiqueLignes(boite, legende, series, etiquettesX, options) {
    if (legende) {
      legende.textContent = ""; legende.classList.add("lignes");
      const entrees = options.legende || (series.length > 1 ? series.map(s => ({ nom: s.nom, couleur: s.couleur })) : []);
      entrees.forEach(s => { const sp = el("span"); const i = el("i", s.zone ? "zone" : null); i.style.background = s.couleur; sp.append(i, document.createTextNode(s.nom)); legende.appendChild(sp); });
    }
    const W = Math.max(260, boite.clientWidth || 600), H = options.hauteur || (W < 480 ? 210 : 250);
    const m = { l: 50, r: 8, t: 10, b: 26 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b, n = etiquettesX.length;
    const tous = series.flatMap(s => s.valeurs).concat(options.bande ? [...options.bande.bas, ...options.bande.haut] : [], (options.points || []).map(p => p.v));
    let min = options.baseLibre ? Math.min(...tous) : Math.min(0, ...tous), max = Math.max(1, ...tous);
    const pas = pasJoli((max - min) / 4), bas = min;
    min = Math.floor(min / pas) * pas; max = Math.ceil(max / pas) * pas;
    // Un creux négatif petit devant le pas (−40 000 $ pour des millions) : l'axe s'arrête juste sous lui,
    // plutôt qu'un pas entier plus bas ; les graduations restent des multiples du pas.
    if (bas < 0 && -bas < pas / 4) min = bas - (max - bas) * 0.03;
    const axe = v => Math.abs(v) < 1e-6 ? "0 $" : Math.abs(v) >= 1e6 ? nb(v / 1e6, 1) + " M$" : pas < 10000 ? nb(v / 1000, 1) + " k$" : k$(v);
    const x = i => m.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = v => m.t + ih - ((v - min) / (max - min)) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="${options.titre}">`;
    for (let v = Math.ceil(min / pas - 1e-9) * pas; v <= max + 1e-6; v += pas) {
      const yy = Math.round(y(v)) + 0.5;
      s += `<line class="${Math.abs(v) < 1e-6 ? "base" : "grille"}" x1="${m.l}" x2="${W - m.r}" y1="${yy}" y2="${yy}"/>`;
      s += `<text class="etiquette" x="${m.l - 8}" y="${yy}" dy="0.32em" text-anchor="end">${axe(v)}</text>`;
    }
    const chaque = Math.max(1, Math.ceil(n / Math.floor(iw / 44)));
    etiquettesX.forEach((t, i) => { if (i % chaque === 0 && (n - 1 - i >= chaque / 2 || i === n - 1) || i === n - 1) s += `<text class="etiquette" x="${x(i)}" y="${H - 6}" text-anchor="${i === n - 1 ? "end" : i === 0 ? "start" : "middle"}">${t}</text>`; });
    if (options.bande) {
      const { bas, haut, couleur } = options.bande;
      const d = haut.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("") +
        bas.map((v, i) => [i, v]).reverse().map(([i, v]) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("") + "Z";
      s += `<path class="bande" d="${d}" style="fill:${couleur}"/>`;
    }
    series.forEach(se => {
      const d = se.valeurs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
      if (options.aire && series.length === 1) s += `<path class="aire" d="${d}L${x(n - 1).toFixed(1)},${y(Math.max(min, 0)).toFixed(1)}L${x(0).toFixed(1)},${y(Math.max(min, 0)).toFixed(1)}Z" style="fill:${se.couleur}"/>`;
      s += `<path class="serie" d="${d}" style="stroke:${se.couleur}"/>`;
    });
    // Points fixes, placés n'importe où sur l'axe (index fractionnaire) : valeurs notées.
    (options.points || []).forEach(p => { s += `<circle class="point-fixe" r="4.5" cx="${x(Math.min(n - 1, p.i)).toFixed(1)}" cy="${y(p.v).toFixed(1)}" style="fill:${p.couleur}"/>`; });
    s += `<line class="reticule" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>`;
    series.forEach((se, j) => { s += `<circle class="point" r="5" cx="0" cy="0" visibility="hidden" data-j="${j}" style="fill:${se.couleur}"/>`; });
    s += `<rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" tabindex="0" data-zone="1" role="slider" aria-valuemin="0" aria-valuemax="${n - 1}" aria-valuenow="${n - 1}" aria-label="${options.titre} : glissez ou utilisez les flèches pour les valeurs"/>`;
    s += "</svg>";
    boite.innerHTML = s;
    const bulle = el("div", "bulle"); bulle.hidden = true; boite.appendChild(bulle);
    const svg = boite.querySelector("svg"), ret = svg.querySelector(".reticule"), points = svg.querySelectorAll(".point"), zone = svg.querySelector("[data-zone]");
    function montrer(i) {
      i = Math.max(0, Math.min(n - 1, i));
      ret.setAttribute("x1", x(i)); ret.setAttribute("x2", x(i)); ret.setAttribute("visibility", "visible");
      points.forEach(p => { const se = series[+p.dataset.j]; p.setAttribute("cx", x(i)); p.setAttribute("cy", y(se.valeurs[i])); p.setAttribute("visibility", "visible"); });
      zone.setAttribute("aria-valuenow", i);
      zone.setAttribute("aria-valuetext", `${options.titreX ? options.titreX(i) : etiquettesX[i]} : ${series.map(se => `${se.nom} ${$(se.valeurs[i])}`).join(", ")}`);
      if (options.surPoint) { options.surPoint(i); return; }
      bulle.textContent = "";
      bulle.appendChild(el("div", "titre", options.titreX ? options.titreX(i) : etiquettesX[i]));
      series.forEach(se => { const r = el("div", "rang"); const k = el("i"); k.style.background = se.couleur; r.append(k, el("strong", null, $(se.valeurs[i])), el("span", null, se.nom)); bulle.appendChild(r); });
      bulle.hidden = false;
      const bw = bulle.offsetWidth;
      let g = x(i) + 12; if (g + bw > W) g = x(i) - bw - 12;
      bulle.style.transform = `translate(${Math.max(0, g)}px, 6px)`;
    }
    const cacher = () => { bulle.hidden = true; ret.setAttribute("visibility", "hidden"); points.forEach(p => p.setAttribute("visibility", "hidden")); if (options.surPoint) options.surPoint(null); };
    let courant = n - 1;
    const suivre = e => { const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width); courant = Math.round(((px - m.l) / iw) * (n - 1)); montrer(courant); };
    zone.addEventListener("pointerdown", suivre);
    zone.addEventListener("pointermove", suivre);
    zone.addEventListener("pointerleave", cacher);
    zone.addEventListener("pointercancel", cacher);
    zone.addEventListener("focus", () => montrer(courant));
    zone.addEventListener("blur", cacher);
    zone.addEventListener("keydown", e => { if (e.key === "ArrowRight") { courant = Math.min(n - 1, courant + 1); montrer(courant); } if (e.key === "ArrowLeft") { courant = Math.max(0, courant - 1); montrer(courant); } });
  }

  window.WM = window.WM || {};
  /* ============================================================
     LEXIQUE : un toucher sur un sigle de la RAMQ ouvre sa définition, sous le mot.
     Seule la première occurrence d'un terme dans une carte devient un bouton, et jamais
     dans un bouton, un lien, une étiquette, un titre, un tableau ou un champ masqué. Navigateur sans
     lookbehind dans les expressions régulières : rien n'est marqué.
     ============================================================ */
  const HORS_LEXIQUE = "button, a, label, summary, input, select, option, textarea, svg, h1, h2, h3, h4, table, .terme, .hero, .segment, .puce, .toast, [aria-hidden='true'], .visuellement-cache, .cache-visuel, [data-si][hidden]";
  let lexiqueRe = null, lexiqueDef = null, bulle = null, ouvert = null;
  function preparerLexique(entrees) {
    lexiqueDef = new Map();
    for (const e of entrees) for (const t of e.termes) lexiqueDef.set(t.toLowerCase(), e);
    const alt = [...lexiqueDef.keys()].sort((a, b) => b.length - a.length).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s")).join("|");
    try { lexiqueRe = new RegExp(`(?<![\\p{L}\\d])(${alt})(?![\\p{L}\\d])`, "giu"); } catch (e) { lexiqueRe = false; }
  }
  function lexique(racine, entrees) {
    if (lexiqueRe === null) preparerLexique(entrees);
    if (!lexiqueRe || !racine) return;
    const portees = new Map();   // carte → termes déjà expliqués
    const dejaDans = p => { if (!portees.has(p)) portees.set(p, new Set([...p.querySelectorAll(".terme")].map(b => b.dataset.terme))); return portees.get(p); };
    const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, { acceptNode: n => {
      lexiqueRe.lastIndex = 0;
      return lexiqueRe.test(n.data) && !n.parentElement.closest(HORS_LEXIQUE) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    } });
    const noeuds = []; while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
    for (let n of noeuds) {
      const deja = dejaDans(n.parentElement.closest(".carte, .feuille, .vue") || racine);
      lexiqueRe.lastIndex = 0;
      let m;
      while ((m = lexiqueRe.exec(n.data))) {
        const e = lexiqueDef.get(m[1].toLowerCase().replace(/\s/g, " ")), cle = e.termes[0];
        if (deja.has(cle)) continue;
        deja.add(cle);
        const mot = n.splitText(m.index), reste = mot.splitText(m[1].length);
        const b = el("button", "terme", m[1]); b.type = "button"; b.dataset.terme = cle; b.setAttribute("aria-expanded", "false");
        // « l'onglet B » : l'article élidé reste collé au mot, sur la même ligne.
        const lie = /\S*['’]$/.exec(n.data);
        if (lie) { const art = n.splitText(n.data.length - lie[0].length), s = el("span", "terme-lie"); art.replaceWith(s); s.append(art, b); mot.remove(); }
        else mot.replaceWith(b);
        n = reste; lexiqueRe.lastIndex = 0;
      }
    }
  }
  function fermerLexique(rendreFocus) {
    if (!bulle) return;
    bulle.remove(); bulle = null;
    if (ouvert) { ouvert.setAttribute("aria-expanded", "false"); if (rendreFocus) ouvert.focus(); }
    ouvert = null;
  }
  // La bulle s'ajoute au panneau ouvert, sinon à la page ; sous le mot, ou au-dessus s'il manque de place.
  function ouvrirLexique(b) {
    const e = lexiqueDef.get(b.dataset.terme.toLowerCase()); if (!e) return;
    const hote = b.closest("dialog[open]") || document.body;
    bulle = el("div", "lexique-bulle"); bulle.setAttribute("role", "status");
    hote.appendChild(bulle);
    const contenu = bulle;
    requestAnimationFrame(() => {
      if (bulle !== contenu) return;
      contenu.append(el("strong", null, b.textContent), document.createTextNode(e.def));
      if (e.ref) contenu.appendChild(el("span", "lexique-ref", e.ref));
      const r = b.getBoundingClientRect(), w = Math.min(320, innerWidth - 32);
      const base = hote === document.body ? { x: -scrollX, y: -scrollY } : (() => { const h = hote.getBoundingClientRect(); return { x: h.left + hote.clientLeft - hote.scrollLeft, y: h.top + hote.clientTop - hote.scrollTop }; })();
      contenu.style.width = w + "px";
      contenu.style.left = (Math.max(16, Math.min(r.left, innerWidth - w - 16)) - base.x) + "px";
      const haut = contenu.offsetHeight, dessous = r.bottom + 8 + haut <= innerHeight - 8;
      contenu.style.top = ((dessous ? r.bottom + 8 : Math.max(8, r.top - 8 - haut)) - base.y) + "px";
    });
    b.setAttribute("aria-expanded", "true"); ouvert = b;
  }
  document.addEventListener("click", ev => {
    const b = ev.target.closest && ev.target.closest(".terme");
    if (b) { const meme = b === ouvert; fermerLexique(false); if (!meme) ouvrirLexique(b); return; }
    if (bulle && !bulle.contains(ev.target)) fermerLexique(false);
  });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape" && bulle) { ev.preventDefault(); ev.stopPropagation(); fermerLexique(true); } }, true);
  window.addEventListener("scroll", () => fermerLexique(false), { capture: true, passive: true });
  window.addEventListener("resize", () => fermerLexique(false));

  window.WM.interface = {
    SERIES, $, $2, nb, pct, signe, k$, texteDe, moisAn, el, icone, hero, puce, rangee, rangees, segment, tableauSimple,
    lignes, moins, signePct, graphiqueLignes, lexique,
  };
})();
