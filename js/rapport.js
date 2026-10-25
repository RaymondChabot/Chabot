/* Wealthnord — rapport PDF. Construit, à la demande, un rapport mis en page pour
   l'impression (format Lettre), avec graphiques en couleurs, puis ouvre la boîte
   d'impression du navigateur : « Enregistrer en PDF ». Rien ne quitte l'appareil. */
(function () {
  "use strict";
  const W = window.Wealthnord;
  if (!W) return;
  const O = W.outils;
  const { $, nb, pct, signe, moisAn, MODES, NOM_MODE, COULEUR_MODE, SCENARIOS, NOMS_METHODES } = O;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // Montant abrégé pour les axes et les étiquettes : 12 k$, 1,25 M$.
  const court = v => Math.abs(v) >= 1e6 ? nb(v / 1e6, 2) + " M$" : Math.abs(v) >= 1e4 ? nb(v / 1000, 0) + " k$" : $(v);
  const C = i => `var(--s${(i % 7) + 1})`;
  const moins = v => Math.abs(v) < 0.5 ? "—" : $(-v);
  const COURT_MODE = { horaire: "Horaire", mixte: "Mixte", acte: "À l'acte" };

  /* ---------- Graphiques (SVG statiques) ---------- */
  function pasJoli(x) {
    if (x <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(x))), n = x / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  // Lignes, avec fourchette (bande) et aire au besoin ; valeur finale écrite au bout de chaque ligne.
  function lignes(o) {
    const L = o.largeur || 700, H = o.hauteur || 220, n = o.x.length;
    const m = { l: 56, r: o.finales === false ? 14 : 86, t: 12, b: 26 };
    const iw = L - m.l - m.r, ih = H - m.t - m.b;
    const tous = o.series.flatMap(s => s.valeurs).concat(o.bande ? [...o.bande.bas, ...o.bande.haut] : []);
    let min = o.baseLibre ? Math.min(...tous) : Math.min(0, ...tous), max = Math.max(1, ...tous);
    const pas = pasJoli((max - min) / 4);
    min = Math.floor(min / pas) * pas; max = Math.ceil(max / pas) * pas;
    if (max === min) max = min + pas;
    const x = i => m.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw), y = v => m.t + ih - ((v - min) / (max - min)) * ih;
    let s = `<svg viewBox="0 0 ${L} ${H}" width="100%" role="img" aria-label="${esc(o.titre || "")}">`;
    for (let v = min; v <= max + 1e-6; v += pas) {
      const yy = Math.round(y(v)) + 0.5;
      s += `<line class="${Math.abs(v) < 1e-6 ? "rp-base" : "rp-grille"}" x1="${m.l}" x2="${L - m.r}" y1="${yy}" y2="${yy}"/>`;
      s += `<text class="rp-axe" x="${m.l - 8}" y="${yy}" dy="0.32em" text-anchor="end">${Math.abs(v) < 1e-6 ? "0 $" : esc(court(v))}</text>`;
    }
    const chaque = Math.max(1, Math.ceil(n / Math.floor(iw / 46)));
    o.x.forEach((t, i) => { if (i % chaque === 0 || i === n - 1) s += `<text class="rp-axe" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === n - 1 ? "end" : "middle"}">${esc(t)}</text>`; });
    if (o.bande) {
      const { bas, haut, couleur } = o.bande;
      const d = haut.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("") +
        bas.map((v, i) => [i, v]).reverse().map(([i, v]) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("") + "Z";
      s += `<path d="${d}" style="fill:${couleur};opacity:0.16"/>`;
    }
    o.series.forEach(se => {
      const d = se.valeurs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
      if (o.aire && o.series.length === 1) s += `<path d="${d}L${x(n - 1).toFixed(1)},${y(Math.max(min, 0)).toFixed(1)}L${x(0).toFixed(1)},${y(Math.max(min, 0)).toFixed(1)}Z" style="fill:${se.couleur};opacity:0.12"/>`;
      s += `<path d="${d}" style="fill:none;stroke:${se.couleur};stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round"/>`;
    });
    // Étiquettes de fin, écartées pour ne pas se chevaucher.
    if (o.finales !== false) {
      const fins = o.series.map(se => ({ se, yy: y(se.valeurs[n - 1]) })).sort((a, b) => a.yy - b.yy);
      for (let i = 1; i < fins.length; i++) if (fins[i].yy - fins[i - 1].yy < 14) fins[i].yy = fins[i - 1].yy + 14;
      fins.forEach(({ se, yy }) => {
        s += `<circle cx="${x(n - 1)}" cy="${y(se.valeurs[n - 1])}" r="4" style="fill:${se.couleur};stroke:#fff;stroke-width:2"/>`;
        s += `<text class="rp-fin" x="${x(n - 1) + 8}" y="${yy}" dy="0.32em">${esc(court(se.valeurs[n - 1]))}</text>`;
      });
    }
    return s + "</svg>";
  }
  const legende = items => `<div class="rp-legende">${items.map(i => `<span><i class="${i.zone ? "zone" : i.ligne ? "ligne" : ""}" style="background:${i.couleur}"></i>${esc(i.nom)}</span>`).join("")}</div>`;
  // Barre empilée et sa légende chiffrée.
  function empilee(parts, total, unite) {
    const t = total || parts.reduce((a, p) => a + Math.max(0, p.valeur), 0) || 1;
    return `<div class="rp-empilee">${parts.filter(p => p.valeur > 0).map(p => `<span style="flex:${p.valeur} 0 0;background:${p.couleur}"></span>`).join("")}</div>
      <div class="rp-cles">${parts.map(p => `<div><i style="background:${p.couleur}"></i><span>${esc(p.nom)}</span><strong>${unite ? unite(p.valeur) : $(p.valeur)}</strong><em>${pct(Math.max(0, p.valeur) / t, 0)}</em></div>`).join("")}</div>`;
  }
  // Barres horizontales (une couleur par entité, ou une seule teinte pour des grandeurs).
  function barres(items, opts = {}) {
    const max = Math.max(1, ...items.map(i => Math.abs(i.valeur)));
    return `<div class="rp-barres">${items.map(i => `<div class="rp-barre">
      <span class="nom">${esc(i.nom)}${i.badge ? ` <b>${esc(i.badge)}</b>` : ""}</span>
      <span class="piste"><span style="width:${Math.max(0.5, Math.abs(i.valeur) / max * 100)}%;background:${i.couleur || opts.couleur || C(0)}"></span></span>
      <span class="val">${esc(i.texte ?? $(i.valeur))}</span></div>`).join("")}</div>`;
  }
  const kpi = (titre, valeur, sous, cls) => `<div class="rp-kpi ${cls || ""}"><span>${esc(titre)}</span><strong>${esc(valeur)}</strong>${sous ? `<em>${esc(sous)}</em>` : ""}</div>`;
  const tableau = (entetes, rangs, cls) => `<table class="rp-table ${cls || ""}"><thead><tr>${entetes.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${
    rangs.map(r => `<tr class="${r.cls || ""}">${r.c.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const marque = `<svg class="rp-logo" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6.5" fill="#121211"/><g transform="rotate(42 12 12)"><path d="M12 4.2 10.1 12H12Z" fill="#e8cf9c"/><path d="M12 4.2 13.9 12H12Z" fill="#b58d55"/><path d="M12 19.8 10.1 12H12Z" fill="#f5f4f0"/><path d="M12 19.8 13.9 12H12Z" fill="#c9c6bc"/></g><circle cx="12" cy="12" r="0.95" fill="#121211"/></svg>`;
  const page = (titre, intro, contenu) => `<section class="rp-page">
    <header class="rp-tete">${marque}<span>Wealthnord</span><span class="rp-tete-titre">${esc(titre)}</span></header>
    <h1>${esc(titre)}</h1>${intro ? `<p class="rp-intro">${esc(intro)}</p>` : ""}${contenu}</section>`;

  /* ---------- Le rapport ---------- */
  function construire() {
    const S = W.etat(), R = W.resultats();
    const p = R.projection, fin = p.length - 1, def = i => R.deflateur(i), dix = Math.min(10, fin);
    const date = new Date().toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
    const g = R.gmfu, soc = R.societeActive, mode = R.mode;
    const scen = SCENARIOS[R.scenario].toLowerCase(), meth = NOMS_METHODES[R.methode].toLowerCase();
    const totalImpot = R.impot.totalGlobal ?? R.impot.total;
    const vals = p.map((x, i) => x.moi / def(i));
    const bas = p.map((x, i) => Math.min(...Object.keys(SCENARIOS).map(k => R.projections[k][i].moi)) / def(i));
    const haut = p.map((x, i) => Math.max(...Object.keys(SCENARIOS).map(k => R.projections[k][i].moi)) / def(i));
    const meilleurMode = MODES.reduce((a, m) => R.nets[m] > R.nets[a] ? m : a, mode);
    const pages = [];

    /* 1. Couverture */
    const points = [
      soc ? `La société garde environ ${$(R.impot.societe.impotSociete / 12)} par mois pour son impôt ; vous, ${$(R.impot.total / 12)} pour l'impôt sur vos dividendes.`
        : `Mettez de côté environ ${$(R.impot.total / 12)} par mois, soit ${pct(R.impot.total / Math.max(1, R.brut), 0)} de chaque paiement de la RAMQ, pour l'impôt et les cotisations.`,
      meilleurMode !== mode ? `${NOM_MODE[meilleurMode]} donnerait ${$(R.nets[meilleurMode] - R.nets[mode])} de plus par année après impôt et frais que votre mode actuel (${NOM_MODE[mode].toLowerCase()}).`
        : `Votre mode actuel (${NOM_MODE[mode].toLowerCase()}) donne le revenu net le plus élevé des trois.`,
      R.sim.libre ? `Méthode ${NOMS_METHODES[R.recommandee].toLowerCase()} recommandée ; avec la méthode ${meth}, plus aucune dette en ${moisAn(R.sim.libre)}.` : "Au rythme actuel, la marge de crédit n'est jamais remboursée.",
      ...O.jalons(R).filter(j => /Valeur nette de 1 M\$/.test(j.titre)).map(j => `Valeur nette de 1 M$ vers ${j.jalon.annee} (scénario ${scen}).`),
    ];
    pages.push(`<section class="rp-page rp-couverture">
      <div class="rp-bandeau">
        <div class="rp-marque">${marque}<span>Wealthnord</span></div>
        <h1>Rapport financier</h1>
        <p class="rp-sous">Médecin de famille en GMF-U · ${esc(NOM_MODE[mode])}${soc ? " · pratique incorporée" : ""}${R.couple ? " · en couple" : ""}</p>
        <p class="rp-date">${esc(date)} · scénario ${esc(scen)} · méthode ${esc(meth)}</p>
      </div>
      <div class="rp-kpis rp-kpis-4">
        ${kpi("Revenu brut", $(R.brut), NOM_MODE[mode])}
        ${kpi("Net après impôt", $(R.nets[mode]), `${$(R.nets[mode] / 12)} par mois`)}
        ${kpi("Surplus mensuel", $(R.surplusMoi), "Après dépenses, dettes et épargne", R.surplusMoi >= 0 ? "bon" : "mauvais")}
        ${kpi("Impôt de l'année", $(totalImpot), `Taux marginal ${pct(R.tauxMarginal, 0)}`)}
        ${kpi("Dettes", $(R.detteTotale), R.sim.libre ? `Sans dettes en ${moisAn(R.sim.libre)}` : "Jamais remboursées")}
        ${kpi("Valeur nette", $(vals[0]), "Aujourd'hui")}
        ${kpi(`Valeur nette en ${p[dix].annee}`, $(vals[dix]), `Entre ${court(bas[dix])} et ${court(haut[dix])}`)}
        ${kpi(`Valeur nette en ${p[fin].annee}`, $(vals[fin]), `Entre ${court(bas[fin])} et ${court(haut[fin])}`, "fort")}
      </div>
      <div class="rp-carte">
        <h2>Valeur nette projetée</h2>
        ${legende([{ nom: `Scénario ${scen}`, couleur: C(0), ligne: true }, { nom: "Du prudent à l'optimiste", couleur: C(0), zone: true }])}
        ${lignes({ x: p.map(x => String(x.annee)), series: [{ nom: "Valeur nette", couleur: C(0), valeurs: vals }], bande: { bas, haut, couleur: C(0) }, hauteur: 230, titre: "Valeur nette projetée" })}
      </div>
      <div class="rp-carte"><h2>Points clés</h2><ul class="rp-points">${points.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    </section>`);

    /* 2. Revenu GMF-U */
    const parts = [["Heures ou forfait horaire", x => x.heures ?? x.forfaitHoraire ?? 0], ["Visites", x => x.visites || 0], ["Acte de supervision", x => x.supervision || 0],
      ["Demi-per diem de supervision", x => x.perDiem], ["Forfaits d'inscription", x => x.forfaitInscription + x.forfaitVulnerable], ["Suppléments sans médecin", x => x.supplements], ["Autres revenus", x => x.autres]];
    const partsUtiles = parts.map((pt, i) => [...pt, i]).filter(([, f]) => MODES.some(m => f(g[m]) > 0));
    const maxMode = Math.max(...MODES.map(m => g[m].total), 1);
    const dj = S.revenu.demiJournees;
    pages.push(page("Revenu GMF-U", `${nb(S.revenu.demiJournees)} demi-journées par semaine, dont ${nb(S.revenu.enseignement)} d'enseignement ; ${nb(S.revenu.patientsParDJ)} patients par demi-journée en clinique ; ${nb(S.revenu.semaines)} semaines. ${S.revenu.annee === "premiere" ? "Première année de pratique : arrivée des nouveaux patients." : "Année type : clientèle stable."}`, `
      <div class="rp-kpis rp-kpis-3">${MODES.map(m => `<div class="rp-kpi rp-mode ${m === mode ? "choisi" : ""}"><span><i style="background:${COULEUR_MODE[m]}"></i>${esc(NOM_MODE[m])}${m === mode ? " · utilisé" : ""}</span><strong>${$(g[m].total)}</strong><em>Net après impôt${g[m].fraisCabinet ? " et frais" : ""} : ${$(R.nets[m])}</em></div>`).join("")}</div>
      <div class="rp-carte"><h2>D'où vient le revenu</h2>
        ${MODES.map(m => `<div class="rp-ligne-empilee"><span class="nom">${esc(COURT_MODE[m])}</span><div class="rp-piste-empilee"><div class="rp-empilee" style="width:${g[m].total / maxMode * 100}%">${partsUtiles.map(([, f, i]) => f(g[m]) > 0 ? `<span style="flex:${f(g[m])} 0 0;background:${C(i)}"></span>` : "").join("")}</div></div><strong>${$(g[m].total)}</strong></div>`).join("")}
        ${legende(partsUtiles.map(([n, , i]) => ({ nom: n, couleur: C(i) })))}
        ${MODES.some(m => g[m].fraisCabinet > 0) ? `<p class="rp-note">Frais de cabinet : ${MODES.filter(m => g[m].fraisCabinet > 0).map(m => `${NOM_MODE[m].toLowerCase()} ${$(g[m].fraisCabinet)}`).join(", ")} par année (${nb(S.revenu.fraisCabinetPct)} % de la facturation${S.revenu.fraisCabinetMois ? ` et ${$(S.revenu.fraisCabinetMois)} par mois` : ""}).</p>` : ""}
      </div>
      <div class="rp-carte"><h2>Revenu net selon les demi-journées par semaine</h2>
        ${legende(MODES.map(m => ({ nom: NOM_MODE[m], couleur: COULEUR_MODE[m], ligne: true })))}
        ${lignes({ x: R.sensDJ.map(x => `${x.v} d.-j.`), series: MODES.map(m => ({ nom: NOM_MODE[m], couleur: COULEUR_MODE[m], valeurs: R.sensDJ.map(x => x[m + "Net"]) })), baseLibre: true, hauteur: 190, titre: "Revenu net selon les demi-journées" })}
        ${tableau(["Demi-journées", "Horaire", "Mixte", "À l'acte"], R.sensDJ.map(x => ({ cls: x.v === dj ? "choisi" : "", c: [`${x.v}${x.v === dj ? " (vous)" : ""}`, ...MODES.map(m => $(x[m + "Net"]))] })), "compact")}
        <p class="rp-note">Après impôt${MODES.some(m => g[m].fraisCabinet > 0) ? " et frais de cabinet" : ""}. Le mixte dépasse l'horaire au-delà de ${g.seuilPatients != null ? nb(g.seuilPatients) : "—"} patients par demi-journée ; l'acte, au-delà de ${g.seuilActe != null ? nb(g.seuilActe) : "—"}. À l'acte : règles d'avant la Loi 2.</p>
      </div>`));

    /* 3. Impôt */
    const x = R.impot.societe, dpro = Math.min(R.dproPerso, R.impot.revenu || 1);
    const cent = soc
      ? [{ nom: "Impôt de la société", valeur: x.impotSociete, couleur: C(0) }, { nom: "Votre impôt sur les dividendes", valeur: R.impot.fed + R.impot.qc + R.impot.fss, couleur: C(1) },
         { nom: "Dépenses et frais de la société", valeur: x.depenses + x.frais, couleur: C(3) }, { nom: "Laissé dans la société", valeur: x.retenu, couleur: C(5) }, { nom: "Reste pour vous", valeur: R.impot.net, couleur: C(4) }]
      : [{ nom: "Impôt fédéral", valeur: R.impot.fed, couleur: C(0) }, { nom: "Impôt du Québec", valeur: R.impot.qc, couleur: C(1) }, { nom: "RRQ, RQAP et FSS", valeur: R.impot.rrq + R.impot.rqap + R.impot.fss, couleur: C(2) },
         { nom: g[mode].fraisCabinet ? "Dépenses et frais de cabinet" : "Dépenses professionnelles", valeur: dpro, couleur: C(3) }, { nom: "Reste pour vous", valeur: R.impot.net - dpro, couleur: C(4) }];
    const I3 = MODES.map(m => R.impots[m]);
    const ligneT = (nom, f, cls) => ({ cls, c: [nom, ...I3.map(f)] });
    const lignesImpot = [
      ligneT(soc ? "Revenu brut, versé à la société" : "Revenu brut", y => $(y.revenu)),
      ...(MODES.some(m => g[m].fraisCabinet > 0) && !soc ? [{ c: ["Frais de cabinet", ...MODES.map(m => moins(g[m].fraisCabinet))] }] : []),
      ...(soc ? [ligneT("Impôt de la société", y => moins(y.societe.impotSociete)), ligneT("Dividendes versés", y => $(y.societe.dividendes)), ligneT("Laissé dans la société", y => $(y.societe.retenu), "sous")] : []),
      ligneT("Impôt fédéral", y => moins(y.fed)), ligneT("Impôt du Québec", y => moins(y.qc)),
      ligneT(soc ? "Fonds des services de santé" : "RRQ, RQAP et FSS", y => moins(y.rrq + y.rqap + y.fss)),
      { cls: "total", c: [soc ? "Net pour vous" : "Net après impôt et frais", ...MODES.map(m => $(R.nets[m]))] },
      ligneT("Taux moyen" + (soc ? ", société comprise" : ""), y => pct(y.tauxMoyen), "sous"),
    ];
    const reer = [5000, 10000, 20000].map(mt => { const rb = R.impotSansReer - R.impotAvecReer(mt); return { c: [$(mt), $(rb), pct(rb / mt, 0), $(mt - rb)] }; });
    const fam = [
      S.famille.calculAuto && R.ages.length ? { c: ["Allocation canadienne pour enfants", $(R.famille.ace)] } : null,
      S.famille.calculAuto && R.ages.length ? { c: ["Allocation famille et fournitures scolaires", $(R.famille.allocationFamille + R.famille.fournitures)] } : null,
      { c: ["Prime d'assurance médicaments", moins(R.primeMoi + R.primeConjointe)] },
      R.couple ? { c: [`Net de ${O.votreP()} après impôt`, $(R.conjointe.net - R.depensesPartenaire)] } : null,
      R.couple && (R.impot.transferts || 0) + (R.conjointe.transferts || 0) > 0 ? { c: ["Crédits transférés entre conjoints", $((R.impot.transferts || 0) + (R.conjointe.transferts || 0))] } : null,
    ].filter(Boolean);
    pages.push(page("Impôt 2026", soc ? "Pratique incorporée : la société paie ses dépenses et son impôt, puis vous verse des dividendes non déterminés." : "Travail autonome : impôt fédéral et du Québec, RRQ des deux parts, RQAP et Fonds des services de santé.", `
      <div class="rp-kpis rp-kpis-4">
        ${kpi("Impôt de l'année", $(totalImpot), soc ? "Société et vous" : "Impôt et cotisations")}
        ${kpi("Taux moyen", pct(R.impot.tauxMoyen, 1), "Du revenu brut")}
        ${kpi("Taux marginal", pct(R.tauxMarginal, 0), "Sur 1 000 $ de plus")}
        ${kpi("À mettre de côté", $(R.impot.total / 12), "Par mois, pour vous")}
      </div>
      <div class="rp-carte"><h2>Sur chaque 100 $ gagnés</h2>${empilee(cent, R.impot.revenu, v => O.$2(v / Math.max(1, R.impot.revenu) * 100))}</div>
      <div class="rp-carte"><h2>Détail selon le mode</h2>${tableau(["", "Horaire", "Mixte", "À l'acte"], lignesImpot)}</div>
      <div class="rp-deux">
        <div class="rp-carte"><h2>Famille${R.couple ? " et couple" : ""}</h2>${tableau(["", "Par année"], fam)}</div>
        <div class="rp-carte"><h2>REER : remboursement</h2>${tableau(["Cotisation", "Remboursement", "Taux", "Coût réel"], reer)}</div>
      </div>`));

    /* 4. Budget */
    const part = S.menage.partCommunMoi / 100, partMoi = b => b.qui === "moi" ? 1 : b.qui === "commun" ? part : 0;
    const cats = [...O.CATALOGUE.map(c => c.cat), "Autres dépenses"].map(c => ({ nom: c, valeur: S.budget.filter(b => O.categorie(b) === c).reduce((a, b) => a + O.mensuel(b) * partMoi(b), 0) }))
      .filter(c => c.valeur > 0).sort((a, b) => b.valeur - a.valeur);
    const nAns = Math.min(R.annees, 20), an0 = +String(S.strategie.debut).slice(0, 4) || new Date().getFullYear();
    const surplus = Array.from({ length: nAns + 1 }, (_, a) => R.surplusAnnee(a));
    pages.push(page("Budget", "Votre part du budget du ménage, par mois.", `
      <div class="rp-kpis rp-kpis-4">
        ${kpi("Revenu net", $(R.netMoi), "Par mois")}
        ${kpi("Dépenses", $(R.depMoi), "Votre part")}
        ${kpi("Paiements de dettes", $(R.dettesMoi), "Minimums")}
        ${kpi("Surplus", $(R.surplusMoi), "Va sur les dettes", R.surplusMoi >= 0 ? "bon" : "mauvais")}
      </div>
      <div class="rp-carte"><h2>Où va votre revenu net</h2>${empilee([
        { nom: "Dépenses", valeur: R.depMoi, couleur: C(0) }, { nom: "Paiements de dettes", valeur: R.dettesMoi, couleur: C(1) },
        { nom: "Épargne", valeur: R.epargneMoi, couleur: C(2) }, { nom: "Surplus", valeur: Math.max(0, R.surplusMoi), couleur: C(3) }], R.netMoi)}</div>
      <div class="rp-carte"><h2>Dépenses par catégorie</h2>${barres(cats.map(c => ({ ...c, texte: `${$(c.valeur)} / mois` })), { couleur: C(0) })}</div>
      <div class="rp-carte"><h2>Votre surplus au fil des ans</h2>
        ${lignes({ x: surplus.map((_, a) => String(an0 + a)), series: [{ nom: "Surplus mensuel", couleur: C(0), valeurs: surplus }], aire: true, hauteur: 170, titre: "Surplus mensuel par année" })}
        <p class="rp-note">Scénario ${esc(scen)} : revenus ${O.signePct(R.hyp.hausseRevenus)} et dépenses ${O.signePct(R.hyp.inflation)} par année ; paliers d'impôt indexés ; allocations selon l'âge des enfants ; cotisations REEE jusqu'à 17 ans.</p>
      </div>`));

    /* 5. Dettes */
    const sd = O.seriesDettes(R.sim, false);
    pages.push(page("Dettes", `Méthode ${meth}, avec ${$(R.extra)} de plus par mois au départ. Hypothèques à taux fixe : intérêt composé deux fois par année, paiement recalculé au renouvellement.`, `
      <div class="rp-kpis rp-kpis-4">
        ${kpi("Dettes aujourd'hui", $(R.detteTotale))}
        ${kpi("Sans dettes en", R.sim.libre ? moisAn(R.sim.libre) : "jamais", "", "fort")}
        ${kpi("Intérêts nets", $(R.sim.interetsNetsTotaux), "Après crédits d'impôt")}
        ${kpi("Méthode recommandée", NOMS_METHODES[R.recommandee], `Valeur nette en ${R.vnMethodes[R.recommandee].annee}`)}
      </div>
      <div class="rp-carte"><h2>Soldes par année</h2>
        ${legende(sd.series.map(s => ({ nom: s.nom, couleur: s.couleur, ligne: true })))}
        ${lignes({ x: sd.etiquettes, series: sd.series, hauteur: 210, finales: false, titre: "Soldes des dettes" })}
      </div>
      <div class="rp-carte"><h2>Chaque dette</h2>${tableau(["Dette", "Solde", "Taux", "Paiement", "Remboursée", "Intérêts nets"],
        S.dettes.map((d, j) => ({ c: [d.nom, $(d.solde), nb(d.taux, 2) + " %", `${$(O.minimumDette(d))} / mois`, R.sim.dettes[j].fin ? moisAn(R.sim.dettes[j].fin) : "jamais", $(R.sim.dettes[j].interetsNets)] })))}</div>
      <div class="rp-carte"><h2>Comparer les méthodes</h2>${tableau(["Méthode", "Sans dettes en", "Coût net", `Valeur nette ${R.vnMethodes.avalanche.annee}`],
        ["avalanche", "hybride", "boule", "minimum"].map(k => ({ cls: k === R.methode ? "choisi" : "", c: [NOMS_METHODES[k] + (k === R.recommandee ? " (recommandée)" : ""), R.sims[k].libre ? moisAn(R.sims[k].libre) : "jamais", R.sims[k].libre ? $(R.sims[k].coutNet) : "—", $(R.vnMethodes[k].moi)] })))}</div>`));

    /* 6. Avenir */
    const cols = [0, Math.round(fin / 2), fin], v = (i, f) => f(p[i]) / def(i);
    const L = [["Maison, votre part", y => y.maisonMoi], ["Hypothèques, votre part", y => -y.hypMoi], ["Équité dans la maison", y => y.equiteMoi, "sous-total"],
      ["Placements : REER, CELI, comptes", y => y.placements], ...(soc ? [["Placements dans la société", y => y.societe]] : []), ["Auto", y => y.voitureMoi], ["Autres dettes, votre part", y => -y.autresMoi]];
    const jal = O.jalons(R);
    pages.push(page("Avenir", `Scénario ${scen} : placements ${nb(R.hyp.rendement, 1)} %, maison ${O.signePct(R.hyp.croissanceMaison)}, autos −${nb(R.hyp.depreciationAuto, 0)} %, inflation ${nb(R.hyp.inflation, 1)} % par année${S.scenarios.dollarsAujourdhui ? " ; montants en dollars d'aujourd'hui" : ""}.`, `
      <div class="rp-carte"><h2>Valeur nette projetée</h2>
        ${legende([{ nom: `Scénario ${scen}`, couleur: C(0), ligne: true }, { nom: "Du prudent à l'optimiste", couleur: C(0), zone: true }])}
        ${lignes({ x: p.map(y => String(y.annee)), series: [{ nom: "Valeur nette", couleur: C(0), valeurs: vals }], bande: { bas, haut, couleur: C(0) }, hauteur: 175, titre: "Valeur nette projetée" })}
      </div>
      <div class="rp-carte"><h2>De quoi elle est faite</h2>${tableau(["", ...cols.map(i => i === 0 ? "Aujourd'hui" : String(p[i].annee))], [
        ...L.map(([n, f, cls]) => ({ cls: cls ? "sous-total" : "", c: [n, ...cols.map(i => { const z = v(i, f); return Math.abs(z) < 0.5 ? "—" : $(z); })] })),
        { cls: "total", c: ["Valeur nette", ...cols.map(i => $(v(i, y => y.moi)))] }], "compact")}</div>
      <div class="rp-deux">
        <div class="rp-colonne">
          <div class="rp-carte"><h2>Selon le scénario</h2>${tableau(["Scénario", "Sans dettes", String(p[fin].annee)], Object.entries(SCENARIOS).map(([k, nom]) => ({ cls: k === R.scenario ? "choisi" : "", c: [nom, R.libres[k] ? moisAn(R.libres[k]) : "jamais", court(R.projections[k][fin].moi / def(fin))] })), "compact")}</div>
          ${R.reee.length ? `<div class="rp-carte"><h2>REEE à 17 ans</h2>${tableau(["Enfant", "Subventions", "À 17 ans"], R.reee.map((r, i) => ({ c: [`${S.epargne.reee.enfants[i].nom}, ${nb(S.epargne.reee.enfants[i].age, 0)} ans`, $(r.subventions), $(r.solde)] })), "compact")}</div>` : ""}
        </div>
        <div class="rp-carte"><h2>Vos jalons</h2><ul class="rp-jalons">${jal.map(j => `<li><b>${esc(j.jalon.mois ? `${j.jalon.mois} ${j.jalon.annee}` : j.jalon.annee)}</b><span>${esc(j.titre)}</span></li>`).join("")}</ul></div>
      </div>`));

    /* 7. Hypothèses et sources */
    const H = ["prudent", "realiste", "optimiste"].map(k => S.scenarios[k]);
    const ver = W.verification();
    const r = S.revenu;
    pages.push(page("Hypothèses et sources", "Les chiffres de ce rapport sont des estimations, calculées sur votre appareil à partir des valeurs saisies.", `
      <div class="rp-carte"><h2>Scénarios</h2>${tableau(["", "Prudent", "Réaliste", "Optimiste"], [
        ["Rendement des placements, après frais", y => nb(y.rendement, 1) + " %"], ["Hausse de la valeur de la maison", y => nb(y.croissanceMaison, 1) + " %"],
        ["Perte de valeur des autos", y => nb(y.depreciationAuto, 0) + " %"], ["Écart de taux : marge et renouvellements", y => (y.ecartTaux > 0 ? "+" : "") + nb(y.ecartTaux, 2) + " pt"],
        ["Inflation des dépenses", y => nb(y.inflation, 1) + " %"], ["Hausse des revenus", y => nb(y.hausseRevenus, 1) + " %"],
      ].map(([n, f]) => ({ c: [n, ...H.map(f)] })))}
        <p class="rp-note">Le scénario réaliste suit les Normes d'hypothèses de projection 2026 de l'Institut de planification financière et de FP Canada (inflation 2,1 %, immobilier 3,1 %, salaires 3,1 %).</p></div>
      <div class="rp-deux">
        <div class="rp-carte"><h2>Rémunération</h2>${tableau(["", ""], [
          ["Tarif horaire (EP 42)", O.$2(r.tarifHoraire) + " / h"], ["Mixte : forfait horaire", O.$2(r.forfaitHoraireMixte) + " / h"], ["Mixte : part du tarif des visites", nb(r.pctMixte) + " %"],
          ["Acte de supervision, à 100 %", O.$2(r.acteSupervision) + " / h"], ["À l'acte : part du tarif", nb(r.pctActe ?? 100) + " %"],
          ["Frais de cabinet", `${nb(r.fraisCabinetPct || 0)} % + ${$(r.fraisCabinetMois || 0)} / mois`], ["Demi-per diem par résident", O.$2(r.perDiemResident)],
        ].map(c => ({ c })), "compact")}</div>
        <div class="rp-carte"><h2>Vérification officielle</h2><p class="rp-gros">${nb(ver.egaux, 0)} sur ${nb(ver.total, 0)}</p>
          <p class="rp-note">montants identiques, à 1 $ près, à ceux de l'outil de calcul du revenu disponible du ministère des Finances du Québec (mai 2026), sur ${ver.cas} cas ; plus grand écart : ${$(ver.pire)}.</p></div>
      </div>
      <div class="rp-carte"><h2>Sources</h2><ul class="rp-sources">
        <li>RAMQ : tarifs de l'onglet B (août 2026), entente particulière 40 (inscription), EP 42 et annexe XXIII (taux horaire et mixte). À l'acte : règles d'avant la Loi 2.</li>
        <li>Tables d'impôt fédérales et du Québec 2026 ; RRQ, RQAP, assurance-emploi et Fonds des services de santé 2026.</li>
        <li>Allocation canadienne pour enfants, Allocation famille et prime d'assurance médicaments 2026.</li>
        <li>Normes d'hypothèses de projection 2026, Institut de planification financière et FP Canada.</li>
        <li>Loi sur l'intérêt : intérêt hypothécaire à taux fixe composé deux fois par année.</li>
      </ul><p class="rp-avis">Estimations seulement : ni avis fiscal, ni avis financier. Validez toute décision avec un comptable ou un planificateur financier.</p></div>`));

    const boite = document.getElementById("rapport");
    boite.innerHTML = pages.join("");
    // Pied de page : date et numéro de page (navigateurs qui gèrent les marges de page).
    let st = document.getElementById("rapport-style");
    if (!st) { st = document.createElement("style"); st.id = "rapport-style"; document.head.appendChild(st); }
    const police = `font-family: "Inter", sans-serif; font-size: 7.5pt; color: #8b8981;`;
    st.textContent = `@page { @bottom-left { content: "Wealthnord · Rapport du ${date.replace(/"/g, "")} · Estimations seulement"; ${police} } @bottom-right { content: "Page " counter(page) " de " counter(pages); ${police} } }`;
  }

  function imprimer() {
    construire();
    document.body.classList.add("impression-rapport");
    const fin = () => { document.body.classList.remove("impression-rapport"); document.getElementById("rapport").textContent = ""; window.removeEventListener("afterprint", fin); };
    window.addEventListener("afterprint", fin);
    // Laisse le temps au navigateur de mettre le rapport en page.
    setTimeout(() => window.print(), 60);
  }
  W.rapport = { construire, imprimer };
})();
