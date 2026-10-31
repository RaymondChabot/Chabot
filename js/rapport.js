/* WealthMorand — rapport PDF. Construit, à la demande, un rapport mis en page pour
   l'impression (format Lettre), avec graphiques en couleurs, puis ouvre la boîte
   d'impression du navigateur : « Enregistrer en PDF ». Rien ne quitte l'appareil.
   Démarre après app.js, une fois les données ouvertes (verrou.js). */
window.Verrou.quandOuvert(function () {
  "use strict";
  const W = window.Wealthnord;
  if (!W) return;
  const O = W.outils;
  const { $, nb, pct, moisAn, moisLong, moisAvant, dateLongue, NOM_MODE, COULEUR_MODE, SCENARIOS, NOMS_METHODES, MILIEUX, nomActivite, frequenceTexte, libelleRevenu } = O;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // Montant abrégé pour les axes et les étiquettes : 12 k$, 1,25 M$.
  const court = v => Math.abs(v) >= 1e6 ? nb(v / 1e6, 2) + " M$" : Math.abs(v) >= 1e4 ? nb(v / 1000, 0) + " k$" : $(v);
  const C = i => `var(--s${(i % 7) + 1})`;
  const moins = v => Math.abs(v) < 0.5 ? "—" : $(-v);
  const COURT_MODE = { horaire: "Horaire", mixte: "Mixte", acte: "À l'acte" };
  const desN = s => s == null || !isFinite(s) ? "—" : nb(s < 0 ? 0 : Math.floor(s + 1e-9) + 1, 0);

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
  const marque = `<svg class="rp-logo" aria-hidden="true"><use href="#wm-lion-i"/></svg>`;
  const page = (titre, intro, contenu) => `<section class="rp-page">
    <header class="rp-tete">${marque}<svg class="rp-nom" aria-hidden="true"><use href="#wm-nom"/></svg><span class="rp-tete-titre">${esc(titre)}</span></header>
    <h1>${esc(titre)}</h1>${intro ? `<p class="rp-intro">${esc(intro)}</p>` : ""}${contenu}</section>`;

  /* ---------- Résidence : le salaire de l'échelle de la FMRQ, puis la pratique à venir ---------- */
  function pageResidence(S, R, mode, milieu) {
    const x = R.res, fin = moisLong(moisAvant(R.debutPratique)), debut = moisLong(R.debutPratique);
    return page("Revenu · résidence", `Médecin résident, R${x.niveau}, jusqu'en ${fin} ; pratique dès ${debut} : ${NOM_MODE[mode].toLowerCase()} en ${milieu}.`, `
      <div class="rp-kpis rp-kpis-3">
        ${kpi("Salaire brut", $(x.brut), `R${x.niveau}, échelle du ${dateLongue(x.echelle)}`)}
        ${kpi("Net après impôt et retenues", $(R.netVue), `${$(R.impot.net / 26)} par paie`)}
        ${kpi(`Pratique dès ${debut}`, $(R.nets[mode]), "Net après impôt et frais, par année")}
      </div>
      <div class="rp-deux">
        <div class="rp-carte"><h2>Votre salaire</h2>${tableau(["", "Par année"], [
          { c: [`Salaire de l'échelle, R${x.niveau}`, $(x.salaire)] },
          ...(x.garde > 0 ? [{ c: ["Prime de responsabilité de garde", $(x.garde)] }] : []),
          ...(x.enseignement > 0 ? [{ c: ["Prime de responsabilité d'enseignement", $(x.enseignement)] }] : []),
          ...(x.autres > 0 ? [{ c: ["Autres revenus d'emploi", $(x.autres)] }] : []),
          { cls: "total", c: ["Total brut", $(x.brut)] }], "compact")}</div>
        <div class="rp-carte"><h2>D'ici la pratique</h2>${tableau(["Date", "Niveau", "Salaire et primes"], [
          { c: ["Aujourd'hui", `R${x.niveau}`, $(x.brut)] },
          ...x.etapes.map(e => ({ c: [dateLongue(e.date), `R${e.niveau}`, $(e.total + x.autres)] })),
          { cls: "total", c: [dateLongue(R.debutPratique + "-01"), "Pratique", $(R.rev[mode].total)] }], "compact")}</div>
      </div>
      <p class="rp-note">Échelle de l'entente FMRQ-MSSS 2021-2028 (annexe I), avec l'ajustement de 0,11 % du 31 mars 2026 (avis de la RAMQ du 16 juillet 2026) ; hausse de 3,5 % le 1er avril 2027. Primes de responsabilité : 13 périodes de 28 jours par année (art. 12.26 et 13.10). Les projections passent de la résidence à la pratique en ${debut}.</p>`);
  }
  function pageImpotResidence(S, R, totalImpot) {
    const I = R.impot, x = R.res;
    return page(`Impôt ${R.parametres.annee}`, "En résidence : salarié. L'établissement retient l'impôt fédéral et du Québec, le RRQ, le RQAP et l'assurance-emploi sur chaque paie.", `
      <div class="rp-kpis rp-kpis-4">
        ${kpi("Impôt de l'année", $(totalImpot), "Impôt et cotisations")}
        ${kpi("Taux moyen", pct(I.tauxMoyen, 1), "Du revenu brut")}
        ${kpi("Taux marginal", pct(R.tauxMarginal, 0), "Sur 1 000 $ de plus")}
        ${kpi("Retenu par paie", $(I.total / 26), "26 paies par année")}
      </div>
      <div class="rp-carte"><h2>Sur chaque 100 $ gagnés</h2>${empilee([
        { nom: "Impôt fédéral", valeur: I.fed, couleur: C(0) }, { nom: "Impôt du Québec", valeur: I.qc, couleur: C(1) },
        { nom: "RRQ, RQAP et assurance-emploi", valeur: I.rrq + I.rqap + I.ae + I.fss, couleur: C(2) },
        { nom: "Cotisation syndicale et scolarité", valeur: x.syndicat + x.scolarite, couleur: C(3) }, { nom: "Reste pour vous", valeur: R.netVue, couleur: C(4) }].filter(m => m.valeur > 0.5),
        I.revenu + (I.autres || 0), v => O.$2(v / Math.max(1, I.revenu + (I.autres || 0)) * 100))}</div>
      <div class="rp-deux">
        <div class="rp-carte"><h2>Détail de l'impôt</h2>${tableau(["", "Par année"], [
          { c: ["Revenu brut", $(I.revenu)] },
          ...(I.autres > 0.5 ? [{ c: ["Location et placements", $(I.autres)] }] : []),
          { cls: "sous", c: ["Revenu imposable", $(I.imposable)] },
          { c: ["Impôt fédéral", moins(I.fed)] }, { c: ["Impôt du Québec", moins(I.qc)] },
          { c: ["RRQ, RQAP et assurance-emploi", moins(I.rrq + I.rqap + I.ae + I.fss)] },
          ...(x.syndicat > 0 ? [{ c: ["Cotisation syndicale", moins(x.syndicat)] }] : []),
          { cls: "total", c: ["Net après impôt et retenues", $(I.net)] },
          ...(x.scolarite > 0 ? [{ cls: "sous", c: ["Moins votre part des droits de scolarité", moins(x.scolarite)] }] : []),
          { cls: "sous", c: ["Taux moyen", pct(I.tauxMoyen)] }], "compact")}</div>
        <div class="rp-carte"><h2>REER : remboursement</h2>${tableau(["Cotisation", "Remboursement", "Taux", "Coût réel"], [2000, 5000, 10000].map(mt => {
          const rb = R.impotSansReer - R.impotAvecReer(mt); return { c: [$(mt), $(rb), pct(rb / mt, 0), $(mt - rb)] }; }))}
          <p class="rp-note">En résidence, le taux est plus bas qu'en pratique : des droits REER gardés pour la pratique rapporteront souvent plus.</p></div>
      </div>`);
  }

  /* ---------- Le rapport ---------- */
  function construire(opts = {}) {
    const S = W.etat(), R = W.resultats();
    const p = R.projection, fin = p.length - 1, def = i => R.deflateur(i), dix = Math.min(10, fin);
    const date = new Date().toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
    const g = R.rev, soc = R.societeActive, mode = R.mode, milieu = MILIEUX[R.milieu].nom;
    const scen = SCENARIOS[R.scenario].toLowerCase(), meth = NOMS_METHODES[R.methode].toLowerCase();
    const totalImpot = R.impot.totalGlobal ?? R.impot.total;
    const vals = p.map((x, i) => x.moi / def(i));
    const bas = p.map((x, i) => Math.min(...Object.keys(SCENARIOS).map(k => R.projections[k][i].moi)) / def(i));
    const haut = p.map((x, i) => Math.max(...Object.keys(SCENARIOS).map(k => R.projections[k][i].moi)) / def(i));
    const meilleurMode = R.modes.reduce((a, m) => R.nets[m] > R.nets[a] ? m : a, mode);
    // Vue résidence : le salaire de résident et ses retenues ; la pratique à venir, en bref.
    const res = R.vueResidence, debut = R.residenceActive ? moisLong(R.debutPratique) : "";
    const pages = [];
    if (opts.fiche) { pages.push(fiche(S, R, date)); return afficher(pages, date, "Fiche"); }
    if (opts.comptable) { pages.push(comptable(S, R, date)); return afficher(pages, date, "Sommaire pour le comptable"); }

    /* 1. Couverture */
    const points = res ? [
      `En résidence, l'impôt et les cotisations sont retenus sur la paie : environ ${$(R.impot.net / 26)} net par paie, ${$(R.netVue / 12)} par mois après les droits de scolarité.`,
      `Pratique dès ${debut} (${NOM_MODE[mode].toLowerCase()} en ${milieu}) : environ ${$(R.nets[mode])} par année après impôt et frais.`,
      R.sim.libre ? `Méthode ${NOMS_METHODES[R.recommandee].toLowerCase()} recommandée ; avec la méthode ${meth}, plus aucune dette en ${moisAn(R.sim.libre)}.` : "Au rythme actuel, la marge de crédit n'est jamais remboursée.",
      ...O.jalons(R).filter(j => /Valeur nette de 1 M\$/.test(j.titre)).map(j => `Valeur nette de 1 M$ vers ${j.jalon.annee} (scénario ${scen}).`),
    ] : [
      soc ? `La société garde environ ${$(R.impot.societe.impotSociete / 12)} par mois pour son impôt ; vous, ${$(R.impot.total / 12)} pour l'impôt sur vos dividendes.`
        : `Mettez de côté environ ${$(R.impot.total / 12)} par mois, soit ${pct(R.impot.total / Math.max(1, R.brut), 0)} de chaque paiement de la RAMQ, pour l'impôt et les cotisations.`,
      !R.plusieursModes ? `${NOM_MODE[mode]} en ${milieu}${g.activites ? `, plus ${$(g.activites)} d'activités en établissement par année` : ""} : ${$(R.nets[mode])} après impôt et frais.`
        : meilleurMode !== mode ? `${NOM_MODE[meilleurMode]} donnerait ${$(R.nets[meilleurMode] - R.nets[mode])} de plus par année après impôt et frais que votre mode actuel (${NOM_MODE[mode].toLowerCase()}).`
        : `Votre mode actuel (${NOM_MODE[mode].toLowerCase()}) donne le revenu net le plus élevé des trois.`,
      R.sim.libre ? `Méthode ${NOMS_METHODES[R.recommandee].toLowerCase()} recommandée ; avec la méthode ${meth}, plus aucune dette en ${moisAn(R.sim.libre)}.` : "Au rythme actuel, la marge de crédit n'est jamais remboursée.",
      ...O.jalons(R).filter(j => /Valeur nette de 1 M\$/.test(j.titre)).map(j => `Valeur nette de 1 M$ vers ${j.jalon.annee} (scénario ${scen}).`),
    ];
    pages.push(`<section class="rp-page rp-couverture">
      <div class="rp-bandeau">
        <svg class="rp-sceau" aria-hidden="true"><use href="#wm-sceau-i"/></svg>
        <div class="rp-marque"><svg class="rp-nom" aria-hidden="true"><use href="#wm-nom"/></svg></div>
        <h1>Rapport financier</h1>
        <p class="rp-sous">${res ? "Médecin résident" : "Médecin de famille"} · ${esc(libelleRevenu())}${soc ? " · pratique incorporée" : ""}${R.couple ? " · en couple" : ""}${W.plan() ? ` · ${esc(W.plan())}` : ""}</p>
        <p class="rp-date">${esc(date)} · scénario ${esc(scen)} · méthode ${esc(meth)}</p>
      </div>
      <div class="rp-kpis rp-kpis-4">
        ${kpi("Revenu brut", $(R.brutVue), res ? `Salaire de résident, R${R.res.niveau}` : libelleRevenu())}
        ${res ? kpi("Net après impôt et retenues", $(R.netVue), `${$(R.netVue / 12)} par mois`) : kpi(R.libelleNet(mode), $(R.nets[mode]), `${$(R.nets[mode] / 12)} par mois`)}
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

    /* 2. Revenu : la résidence ; ou la pratique principale (un ou trois modes) et les activités en établissement */
    if (res) pages.push(pageResidence(S, R, mode, milieu));
    const M = R.modes, plusieurs = R.plusieursModes;
    const parts = [["Heures ou forfait horaire", x => x.heures ?? x.forfaitHoraire ?? 0], ["Visites", x => x.visites || 0], ["Intervention de supervision", x => x.supervision || 0],
      ["Forfaits de responsabilité", x => x.responsabilite || 0], ["Demi-per diem des apprenants", x => x.perDiem], ["Forfaits d'inscription", x => x.forfaitInscription + x.forfaitVulnerable], ["Forfait GMF", x => x.forfaitGmf || 0], ["Suppléments à l'inscription", x => x.supplements],
      ["Volume de patients", x => x.volume || 0], ["Compensation des frais de cabinet", x => x.compensation || 0], ["Activités en établissement", x => x.activites || 0], ["Pratique polyvalente", x => x.polyvalence || 0],
      ["Autres revenus professionnels", x => x.autres]];
    const partsUtiles = parts.map((pt, i) => [...pt, i]).filter(([, f]) => M.some(m => f(g[m]) > 0));
    const maxMode = Math.max(...M.map(m => g[m].total), 1);
    const dj = S.revenu.demiJournees, ens = R.milieu === "gmfu" ? S.revenu.enseignement : 0, srv = S.revenu.demiJourneesSRV;
    const colsSens = plusieurs ? M.map(m => COURT_MODE[m]) : ["Brut", soc ? "Pour vous" : "Net"];
    const kpisRevenu = plusieurs
      ? M.map(m => `<div class="rp-kpi rp-mode ${m === mode ? "choisi" : ""}"><span><i style="background:${COULEUR_MODE[m]}"></i>${esc(NOM_MODE[m])}${m === mode ? " · utilisé" : ""}</span><strong>${$(g[m].total)}</strong><em>${R.libelleNet(m)} : ${$(R.nets[m])}</em></div>`).join("")
      : kpi("Revenu brut", $(g[mode].total), NOM_MODE[mode]) + kpi("Frais de cabinet", $(g[mode].fraisCabinet), `${nb(S.revenu.fraisCabinetPct)} % de la facturation de la clinique`) + kpi(soc ? "Pour vous" : "Net après impôt et frais", $(R.nets[mode]), `${$(R.nets[mode] / 12)} par mois`);
    const acts = S.revenu.activites || [], autresL = S.revenu.lignes.filter(l => O.annuelLigne(l) > 0);
    const serre = acts.length > 0 && autresL.length > 0;   // page chargée : graphique et tableau plus courts
    const apprenants = ens ? [S.revenu.residents && `${nb(S.revenu.residents)} résident${S.revenu.residents > 1 ? "s" : ""}`, S.revenu.externes && `${nb(S.revenu.externes)} externe${S.revenu.externes > 1 ? "s" : ""}`].filter(Boolean).join(" et ") : "";
    if (!res) pages.push(page(`Revenu · ${milieu}`, `${nb(dj)} demi-journées de rendez-vous par semaine${ens ? `, dont ${nb(ens)} d'enseignement${apprenants ? ` (${apprenants})` : ""}` : ""}, à ${nb(S.revenu.patientsParDJ)} patients${srv ? ` ; ${nb(srv)} de sans rendez-vous à ${nb(S.revenu.patientsSRV)} patients` : ""} ; ${nb(S.revenu.semaines)} semaines en clinique. ${S.revenu.annee === "premiere" ? "Première année de pratique : arrivée des nouveaux patients." : "Année type : clientèle stable."}${S.revenu.majorationPct ? ` Majoration de ${nb(S.revenu.majorationPct)} % selon le territoire.` : ""}`, `
      <div class="rp-kpis rp-kpis-3">${kpisRevenu}</div>
      <div class="rp-carte"><h2>D'où vient le revenu</h2>
        ${M.map(m => `<div class="rp-ligne-empilee"><span class="nom">${esc(COURT_MODE[m])}</span><div class="rp-piste-empilee"><div class="rp-empilee" style="width:${g[m].total / maxMode * 100}%">${partsUtiles.map(([, f, i]) => f(g[m]) > 0 ? `<span style="flex:${f(g[m])} 0 0;background:${C(i)}"></span>` : "").join("")}</div></div><strong>${$(g[m].total)}</strong></div>`).join("")}
        ${legende(partsUtiles.map(([n, , i]) => ({ nom: n, couleur: C(i) })))}
        ${M.some(m => g[m].fraisCabinet > 0) ? `<p class="rp-note">Frais de cabinet : ${M.filter(m => g[m].fraisCabinet > 0).map(m => `${plusieurs ? NOM_MODE[m].toLowerCase() + " " : ""}${$(g[m].fraisCabinet)}`).join(", ")} par année (${nb(S.revenu.fraisCabinetPct)} % de la facturation de la clinique${S.revenu.fraisCabinetMois ? ` et ${$(S.revenu.fraisCabinetMois)} par mois` : ""}).</p>` : ""}
      </div>
      ${acts.length && autresL.length ? `<div class="rp-deux">` : ""}
      ${acts.length ? `<div class="rp-carte"><h2>Activités en établissement</h2>${tableau(["", "Fréquence", "Par jour", "Par année"], [
        ...acts.map((a, i) => ({ c: [nomActivite(a), frequenceTexte(a), $(g.detailActivites[i].parJour), $(g.detailActivites[i].total)] })),
        ...(acts.length > 1 ? [{ cls: "total", c: ["Total", "", "", $(g.activites)] }] : [])])}
        <p class="rp-note">Revenus par jour indicatifs ou estimés (patients par jour × revenu moyen par patient) : à préciser avec vos relevés de la RAMQ.</p></div>` : ""}
      ${autresL.length ? `<div class="rp-carte"><h2>Autres revenus</h2>${tableau(["", "Type", "Par année"], [
        ...autresL.map(l => ({ c: [O.nomLigne(l), O.estPro(l) ? "Professionnel" : "Imposable, sans RRQ ni RQAP", $(O.annuelLigne(l))] })),
        ...(autresL.length > 1 ? [{ cls: "total", c: ["Total", "", $(autresL.reduce((t, l) => t + O.annuelLigne(l), 0))] }] : [])], "compact")}</div>` : ""}
      ${acts.length && autresL.length ? `</div>` : ""}
      <div class="rp-carte"><h2>Revenu net selon les demi-journées de rendez-vous</h2>
        ${plusieurs ? legende(M.map(m => ({ nom: NOM_MODE[m], couleur: COULEUR_MODE[m], ligne: true }))) : ""}
        ${lignes({ x: R.sensDJ.map(x => `${x.v} d.-j.`), series: M.map(m => ({ nom: NOM_MODE[m], couleur: COULEUR_MODE[m], valeurs: R.sensDJ.map(x => x[m + "Net"]) })), baseLibre: true, hauteur: serre ? 130 : acts.length || autresL.length ? 160 : 190, titre: "Revenu net selon les demi-journées" })}
        ${tableau(["Demi-journées", ...colsSens], R.sensDJ.filter(x => !serre || Math.abs(x.v - dj) <= 2).map(x => ({ cls: x.v === dj ? "choisi" : "", c: [`${x.v}${x.v === dj ? " (vous)" : ""}`, ...(plusieurs ? M.map(m => $(x[m + "Net"])) : [$(x[mode]), $(x[mode + "Net"])])] })), "compact")}
        <p class="rp-note">Après impôt${M.some(m => g[m].fraisCabinet > 0) ? " et frais de cabinet" : ""}. ${plusieurs ? `Dès ${desN(g.seuilMixte)} patients par demi-journée, le mixte dépasse le taux horaire ; dès ${desN(g.seuilActeMixte)}, l'acte dépasse le mixte. Le forfait de responsabilité du taux horaire est compris. ` : ""}À l'acte : règles d'avant la Loi 2.</p>
      </div>`));

    /* 3. Impôt */
    if (res) pages.push(pageImpotResidence(S, R, totalImpot));
    const x = R.impot.societe, dpro = Math.min(R.dproPerso, R.impot.revenu || 1);
    const cent = soc
      ? [{ nom: "Impôt de la société", valeur: x.impotSociete, couleur: C(0) }, { nom: "Votre impôt sur les dividendes", valeur: R.impot.fed + R.impot.qc + R.impot.fss, couleur: C(1) },
         { nom: "Dépenses et frais de la société", valeur: x.depenses + x.frais, couleur: C(3) }, { nom: "Laissé dans la société", valeur: x.retenu, couleur: C(5) }, { nom: "Reste pour vous", valeur: R.impot.net, couleur: C(4) }]
      : [{ nom: "Impôt fédéral", valeur: R.impot.fed, couleur: C(0) }, { nom: "Impôt du Québec", valeur: R.impot.qc, couleur: C(1) }, { nom: "RRQ, RQAP et FSS", valeur: R.impot.rrq + R.impot.rqap + R.impot.fss, couleur: C(2) },
         { nom: g[mode].fraisCabinet ? "Dépenses et frais de cabinet" : "Dépenses professionnelles", valeur: dpro, couleur: C(3) }, { nom: "Reste pour vous", valeur: R.impot.net - dpro, couleur: C(4) }];
    const I3 = R.modes.map(m => R.impots[m]);
    const ligneT = (nom, f, cls) => ({ cls, c: [nom, ...I3.map(f)] });
    const lignesImpot = [
      ligneT(soc ? "Revenu brut, versé à la société" : "Revenu brut", y => $(y.revenu)),
      ...(R.modes.some(m => g[m].fraisCabinet > 0) && !soc ? [{ c: ["Frais de cabinet", ...R.modes.map(m => moins(g[m].fraisCabinet))] }] : []),
      ...(soc ? [ligneT("Impôt de la société", y => moins(y.societe.impotSociete)), ligneT("Dividendes versés", y => $(y.societe.dividendes)), ligneT("Laissé dans la société", y => $(y.societe.retenu), "sous")] : []),
      ligneT("Impôt fédéral", y => moins(y.fed)), ligneT("Impôt du Québec", y => moins(y.qc)),
      ligneT(soc ? "Fonds des services de santé" : "RRQ, RQAP et FSS", y => moins(y.rrq + y.rqap + y.fss)),
      { cls: "total", c: [soc ? "Net pour vous" : "Net après impôt et frais", ...R.modes.map(m => $(R.nets[m]))] },
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
    const proL = S.impot.depensesProMode === "detail" ? S.impot.depensesProDetail.filter(l => O.annuelLigne(l) > 0) : [];
    const dproTable = [
      ...(proL.length ? proL.map(l => ({ c: [O.ITEMS_PRO.get(l.k).nom, $(O.annuelLigne(l))] })) : [{ c: ["Total estimé", $(R.depensesPro)] }]),
      ...(proL.length > 1 ? [{ cls: "total", c: ["Total", $(R.depensesPro)] }] : []),
    ];
    if (!res) pages.push(page(`Impôt ${R.parametres.annee}`, soc ? "Pratique incorporée : la société paie ses dépenses et son impôt, puis vous verse des dividendes non déterminés." : "Travail autonome : impôt fédéral et du Québec, RRQ des deux parts, RQAP et Fonds des services de santé.", `
      <div class="rp-kpis rp-kpis-4">
        ${kpi("Impôt de l'année", $(totalImpot), soc ? "Société et vous" : "Impôt et cotisations")}
        ${kpi("Taux moyen", pct(R.impot.tauxMoyen, 1), "Du revenu brut")}
        ${kpi("Taux marginal", pct(R.tauxMarginal, 0), "Sur 1 000 $ de plus facturés")}
        ${kpi("À mettre de côté", $(R.impot.total / 12), "Par mois, pour vous")}
      </div>
      <div class="rp-carte"><h2>Sur chaque 100 $ gagnés</h2>${empilee(cent, R.impot.revenu, v => O.$2(v / Math.max(1, R.impot.revenu) * 100))}</div>
      <div class="rp-carte"><h2>${R.plusieursModes ? "Détail selon le mode" : "Détail de l'impôt"}</h2>${tableau(["", ...R.modes.map(m => R.plusieursModes ? COURT_MODE[m] : "Par année")], lignesImpot)}</div>
      <div class="rp-deux">
        <div class="rp-carte"><h2>Famille${R.couple ? " et couple" : ""}</h2>${tableau(["", "Par année"], fam)}</div>
        <div class="rp-carte"><h2>REER : remboursement</h2>${tableau(["Cotisation", "Remboursement", "Taux", "Coût réel"], reer)}
          ${(S.epargne.celiapp || {}).cotisationAnnuelle ? `<p class="rp-note">CELIAPP : ${$(S.epargne.celiapp.cotisationAnnuelle)} par année, déduits comme le REER, jusqu'au plafond à vie de 40 000 $.</p>` : ""}</div>
      </div>
      ${R.depensesPro > 0 ? `<div class="rp-carte"><h2>Dépenses professionnelles</h2>${tableau(["", "Par année"], dproTable, "compact")}
        <p class="rp-note">${soc ? "Payées par la société." : "Déduites du revenu imposable."}</p></div>` : ""}`));

    /* 4. Budget */
    const part = S.menage.partCommunMoi / 100, partMoi = b => b.qui === "moi" ? 1 : b.qui === "commun" ? part : 0;
    const cats = [...O.CATALOGUE.map(c => c.cat), "Autres dépenses"].map(c => ({ nom: c, valeur: O.depensesEffectives().filter(b => O.categorie(b) === c).reduce((a, b) => a + O.mensuel(b) * partMoi(b), 0) }))
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
      ["Placements : REER, CELI, CELIAPP, comptes", y => y.placements], ...(soc ? [["Placements dans la société", y => y.societe]] : []), ["Auto", y => y.voitureMoi],
      ...((S.actifs.autres || []).length ? [["Autres actifs", y => y.autresActifsMoi]] : []), ["Autres dettes, votre part", y => -y.autresMoi]]
      .filter(([n]) => !R.locataire || !/Maison|Hypoth|Équité/.test(n) || S.dettes.some(d => d.type === "hypotheque"));
    const jal = O.jalons(R);
    const objs = R.objectifs || [];
    pages.push(page("Patrimoine", `Scénario ${scen} : placements ${nb(R.hyp.rendement, 1)} %${R.locataire ? "" : `, maison ${O.signePct(R.hyp.croissanceMaison)}`}, autos −${nb(R.hyp.depreciationAuto, 0)} %, inflation ${nb(R.hyp.inflation, 1)} % par année${S.scenarios.dollarsAujourdhui ? " ; montants en dollars d'aujourd'hui" : ""}.`, `
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
          ${objs.length ? `<div class="rp-carte"><h2>Objectifs d'épargne</h2>${tableau(["Objectif", "Visé", "Par mois"], objs.map(o => ({ c: [`${o.nom || "Objectif"}${o.date ? ` · ${o.date}` : ""}`, $(+o.cible || 0), o.atteint ? "atteint" : $(o.dedie ? o.mensuel : Math.max(0, o.mensuel - o.prevu))] })), "compact")}</div>` : ""}
        </div>
        <div class="rp-carte"><h2>Vos jalons</h2><ul class="rp-jalons">${jal.map(j => `<li><b>${esc(j.jalon.mois ? `${j.jalon.mois} ${j.jalon.annee}` : j.jalon.annee)}</b><span>${esc(j.titre)}</span></li>`).join("")}</ul></div>
      </div>`));

    /* Dossier pour mes proches : une page, s'il est rempli. */
    const A = O.analyseDossier(R), D = A.D, oui = v => v ? "Oui" : "Non";
    if (Object.values(D).some(v => v !== "" && v !== 0 && v !== false && v != null)) {
      const txt = v => String(v || "").trim() || "—";   // les cellules du tableau sont échappées
      pages.push(page("Dossier pour mes proches", "Ce que vos proches doivent savoir si vous devenez inapte ou décédez. À ranger avec vos documents importants.", `
      <div class="rp-deux">
        <div class="rp-carte"><h2>Assurances</h2>${tableau(["", ""], [
          { c: ["Assurance vie", (+D.vieCouverture || 0) > 0 ? $(+D.vieCouverture) : "—"] }, { c: ["Assureur et police", txt(D.vieAssureur)] }, { c: ["Bénéficiaires", txt(D.vieBeneficiaires)] },
          { c: ["Assurance invalidité", (+D.invaliditeMensuelle || 0) > 0 ? `${$(+D.invaliditeMensuelle)} par mois` : "—"] }, { c: ["Délai de carence", D.invaliditeCarence ? `${nb(D.invaliditeCarence)} jours` : "—"] },
          { c: ["Assureur et police", txt(D.invaliditeAssureur)] }, { c: ["Maladies graves", (+D.maladiesGraves || 0) > 0 ? $(+D.maladiesGraves) : "—"] },
        ], "compact")}
          <p class="rp-note">Besoin d'assurance vie estimé : ${$(A.besoin)}${A.charge ? " (dettes, dix ans de dépenses, frais au décès, moins les placements)" : " (dettes et frais au décès, moins les placements)"}. Ordre de grandeur seulement.</p></div>
        <div class="rp-carte"><h2>Documents et personnes-ressources</h2>${tableau(["", ""], [
          { c: ["Testament à jour", oui(D.testament)] }, { c: ["Mandat de protection", oui(D.mandat)] }, { c: ["Procuration bancaire", oui(D.procuration)] },
          { c: ["Où trouver les documents", txt(D.documents)] }, { c: ["Notaire", txt(D.notaire)] }, { c: ["Comptable", txt(D.comptable)] }, { c: ["Conseiller financier", txt(D.conseiller)] },
        ], "compact")}</div>
      </div>
      ${(D.notes || "").trim() ? `<div class="rp-carte"><h2>Autres consignes</h2><p>${esc(txt(D.notes))}</p></div>` : ""}
      <div class="rp-carte"><h2>Ce que vous possédez et devez</h2>${tableau(["Compte ou bien", "Valeur"], [
        { c: ["Comptes et encaisse", $(S.epargne.encaisse)] }, { c: ["REER", $(S.epargne.reer.solde)] }, { c: ["CELI", $(S.epargne.celi.solde)] },
        ...((S.epargne.celiapp || {}).solde ? [{ c: ["CELIAPP", $(S.epargne.celiapp.solde)] }] : []),
        ...(R.locataire ? [] : [{ c: ["Maison, votre part", $(p[0].maisonMoi)] }]),
        ...(S.actifs.autres || []).map(x => ({ c: [x.nom || "Actif", $((+x.valeur || 0) * (x.partMoi ?? 100) / 100)] })),
        ...S.dettes.map(d => ({ c: [d.nom, moins(d.solde * (d.partMoi ?? 100) / 100)] })),
        { cls: "total", c: ["Valeur nette", $(p[0].moi)] }], "compact")}</div>`));
    }

    /* 7. Hypothèses et sources */
    const H = ["prudent", "realiste", "optimiste"].map(k => R.hypDe(k)), rp = R.rendementProfil;
    const ver = W.verification();
    const r = S.revenu;
    pages.push(page("Hypothèses et sources", "Les chiffres de ce rapport sont des estimations, calculées sur votre appareil à partir des valeurs saisies.", `
      <div class="rp-carte"><h2>Scénarios</h2>${tableau(["", "Prudent", "Réaliste", "Optimiste"], [
        ["Rendement des placements, après frais", y => nb(y.rendement, 1) + " %"], ["Hausse de la valeur de la maison", y => nb(y.croissanceMaison, 1) + " %"],
        ["Perte de valeur des autos", y => nb(y.depreciationAuto, 0) + " %"], ["Écart de taux : marge et renouvellements", y => (y.ecartTaux > 0 ? "+" : "") + nb(y.ecartTaux, 2) + " pt"],
        ["Inflation des dépenses", y => nb(y.inflation, 1) + " %"], ["Hausse des revenus", y => nb(y.hausseRevenus, 1) + " %"],
      ].map(([n, f]) => ({ c: [n, ...H.map(f)] })))}
        <p class="rp-note">Le scénario réaliste suit les Normes d'hypothèses de projection 2026 de l'Institut de planification financière et de FP Canada (inflation 2,1 %, immobilier 3,1 %, salaires 3,1 %).${S.scenarios.rendementAuto ? ` Rendement : ${nb(rp.pctActions, 0)} % d'actions et ${nb(100 - rp.pctActions, 0)} % de revenu fixe, soit ${nb(rp.brut, 1)} % avant frais${rp.frais ? `, moins ${nb(rp.frais, 2)} % de frais de gestion` : " (frais de gestion non précisés)"}.` : ""}</p></div>
      <div class="rp-deux">
        <div class="rp-carte"><h2>Rémunération</h2>${tableau(["", ""], [
          ["Tarif horaire (annexe XIV)", `${O.$2(r.tarifHoraire)} / h, à 100 % jusqu'à ${nb(r.heuresMax100 ?? 1540, 0)} h`], ["Mixte : forfait horaire", O.$2(r.forfaitHoraireMixte) + " / h"], ["Mixte : part du tarif des visites", nb(r.pctMixte, 2) + " %"],
          ...(R.milieu === "gmfu" ? [["Mixte : intervention de supervision", `${O.$2(r.acteSupervision)} / h à ${nb(r.pctSupervision, 2)} %`]] : []), ["À l'acte : part du tarif", nb(r.pctActe ?? 100) + " %"],
          ["Forfait d'inscription", O.$2(r.forfaitInscription) + " par patient"], ...(r.membreGmf ? [["Forfait GMF (08875)", `${O.$2(r.forfaitGmf)} par patient vu`]] : []), ["Frais de cabinet", `${nb(r.fraisCabinetPct || 0)} % + ${$(r.fraisCabinetMois || 0)} / mois`],
          ...(R.milieu === "gmfu" ? [["Demi-per diem : résident, externe", `${O.$2(r.perDiemResident)}, ${O.$2(r.perDiemExterne)}`]] : []), ...(r.majorationPct ? [["Majoration selon le territoire", nb(r.majorationPct) + " %"]] : []),
        ].map(c => ({ c })), "compact")}</div>
        <div class="rp-carte"><h2>Vérification officielle</h2><p class="rp-gros">${nb(ver.egaux, 0)} sur ${nb(ver.total, 0)}</p>
          <p class="rp-note">montants identiques, à 1 $ près, à ceux de l'outil de calcul du revenu disponible du ministère des Finances du Québec (mai 2026), sur ${ver.cas} cas ; plus grand écart : ${$(ver.pire)}.</p></div>
      </div>
      <div class="rp-carte"><h2>Sources</h2><ul class="rp-sources">
        <li>RAMQ : tarifs de l'onglet B du manuel de rémunération à l'acte et Brochure no 1 (consultés le 25 octobre 2026), en cabinet ou en établissement selon la pratique : annexe XIV (taux horaire), annexe XXIII (mixte), EP 40 (forfaits, suppléments, volume de patients, pratique polyvalente) et EP 42 (demi-per diem). À l'acte : règles d'avant la Loi 2. Tarifs et montants modifiables dans l'app.</li>
        <li>Collège des médecins du Québec : grille tarifaire 2026-2027 ; ACPM : cotisations 2027 au Québec ; FMOQ : infolettres sur l'entente.</li>
        <li>CELIAPP : Agence du revenu du Canada (8 000 $ par année, 40 000 $ à vie).</li>
        <li>${R.parametres.provisoire ? `Impôt ${R.parametres.annee}, montants provisoires : ceux de 2026 indexés selon la formule officielle (fédéral ${nb(R.parametres.index.federal * 100, 1)} %, Québec ${nb(R.parametres.index.quebec * 100, 2)} %, indice des prix de Statistique Canada) ; assurance-emploi selon le rapport actuariel 2027 du BSIF ; RRQ et RQAP de 2026, en attendant.` : "Tables d'impôt fédérales et du Québec 2026 ; RRQ, RQAP, assurance-emploi et Fonds des services de santé 2026."}</li>
        <li>Allocation canadienne pour enfants, Allocation famille et prime d'assurance médicaments 2026.</li>
        <li>Normes d'hypothèses de projection 2026, Institut de planification financière et FP Canada.</li>
        <li>Loi sur l'intérêt : intérêt hypothécaire à taux fixe composé deux fois par année.</li>
      </ul><p class="rp-avis">Estimations seulement : ni avis fiscal, ni avis financier. Validez toute décision avec un comptable ou un planificateur financier.</p></div>`));

    afficher(pages, date, "Rapport");
  }
  // Met les pages dans la page, avec le pied de page (date et numéro de page).
  function afficher(pages, date, genre) {
    const boite = document.getElementById("rapport");
    boite.innerHTML = pages.join("");
    // Pied de page : date et numéro de page (navigateurs qui gèrent les marges de page).
    let st = document.getElementById("rapport-style");
    if (!st) { st = document.createElement("style"); st.id = "rapport-style"; document.head.appendChild(st); }
    const police = `font-family: "Inter", sans-serif; font-size: 7.5pt; color: #8b8981;`;
    st.textContent = `@page { @bottom-left { content: "WealthMorand · ${genre} du ${date.replace(/"/g, "")} · Estimations seulement"; ${police} } @bottom-right { content: "Page " counter(page) " de " counter(pages); ${police} } }`;
  }

  /* Fiche d'une page : l'essentiel, pour un ou une partenaire, un comptable ou un conseiller. */
  function fiche(S, R, date) {
    const p = R.projection, x = p[0], dix = Math.min(10, p.length - 1), F = O.independance(R, false);
    const part = S.menage.partCommunMoi / 100, qui = b => b.qui === "moi" ? 1 : b.qui === "commun" ? part : 0;
    const parCat = new Map();
    for (const b of O.depensesEffectives()) parCat.set(O.categorie(b), (parCat.get(O.categorie(b)) || 0) + O.mensuel(b) * qui(b));
    const cats = [...parCat].filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]);
    const reste = cats.slice(4).reduce((t, [, v]) => t + v, 0);
    const actifs = [["Comptes et encaisse", S.epargne.encaisse], ["REER", S.epargne.reer.solde], ["CELI", S.epargne.celi.solde], ["CELIAPP", (S.epargne.celiapp || {}).solde || 0],
      ["Maison, votre part", x.maisonMoi], ["Auto", x.voitureMoi], ["Placements dans la société", R.societeActive ? x.societe : 0], ["Autres actifs", x.autresActifsMoi || 0], ["Épargne des objectifs", x.objectifs || 0]].filter(([, v]) => Math.abs(v) >= 0.5);
    const passifs = S.dettes.map(d => [d.nom, d.solde * (d.partMoi ?? 100) / 100]).filter(([, v]) => v >= 0.5);
    const jal = O.jalons(R).slice(0, 5), objs = (R.objectifs || []).slice(0, 4);
    return page("Fiche financière", `${date} · ${libelleRevenu()}${R.societeActive ? " · pratique incorporée" : ""}${R.couple ? " · en couple" : ""}${W.plan() ? ` · ${W.plan()}` : ""}. Votre part, scénario ${SCENARIOS[R.scenario].toLowerCase()}.`, `
      <div class="rp-kpis rp-kpis-4">
        ${kpi("Revenu brut", $(R.brutVue), R.vueResidence ? "Salaire de résident, par année" : "Par année")}
        ${kpi("Revenu net", $(R.netMoi), "Par mois")}
        ${kpi("Surplus", $(R.surplusMoi), "Par mois", R.surplusMoi >= 0 ? "bon" : "mauvais")}
        ${kpi(R.vueResidence ? "Impôt retenu sur la paie" : "Impôt à mettre de côté", $(R.impot.total / 12), "Par mois")}
        ${kpi("Dettes", $(R.detteTotale), R.sim.libre ? `Sans dettes en ${moisAn(R.sim.libre)}` : "Jamais remboursées")}
        ${kpi("Valeur nette", $(x.moi), "Aujourd'hui")}
        ${kpi(`Valeur nette en ${p[dix].annee}`, $(p[dix].moi / R.deflateur(dix)), `Scénario ${SCENARIOS[R.scenario].toLowerCase()}`)}
        ${kpi("Indépendance financière", F.annee ? String(F.annee) : "—", F.annee ? `${nb(F.mult)} fois les dépenses${F.age ? ` · à ${F.age} ans` : ""}` : "Pas sur l'horizon", "fort")}
      </div>
      <div class="rp-deux">
        <div class="rp-carte"><h2>Le mois</h2>${tableau(["", "Par mois"], [
          { c: ["Revenu net", $(R.netMoi)] },
          ...cats.slice(0, 4).map(([n, v]) => ({ c: [n, moins(v)] })), ...(reste > 0.5 ? [{ c: ["Autres dépenses", moins(reste)] }] : []),
          { c: ["Paiements de dettes", moins(R.dettesMoi)] }, { c: ["Épargne et objectifs", moins(R.epargneMoi)] },
          { cls: "total", c: ["Surplus", $(R.surplusMoi)] }], "compact")}</div>
        <div class="rp-carte"><h2>Bilan d'aujourd'hui</h2>${tableau(["", "Valeur"], [
          ...actifs.map(([n, v]) => ({ c: [n, $(v)] })), ...passifs.map(([n, v]) => ({ c: [n, moins(v)] })),
          { cls: "total", c: ["Valeur nette", $(x.moi)] }], "compact")}</div>
      </div>
      <div class="rp-deux">
        <div class="rp-carte"><h2>Dettes</h2>${S.dettes.length ? tableau(["Dette", "Solde", "Taux", "Sans dette en"], S.dettes.map((d, i) => ({ c: [d.nom, $(d.solde), `${nb(d.taux, 2)}\u00a0%`, R.sim.dettes[i] && R.sim.dettes[i].fin ? R.sim.dettes[i].fin.toLocaleDateString("fr-CA", { month: "short", year: "numeric" }) : "—"] })), "compact") : `<p class="rp-note">Aucune dette.</p>`}</div>
        <div class="rp-carte"><h2>Objectifs et jalons</h2>
          ${objs.length ? tableau(["Objectif", "Visé", "Par mois"], objs.map(o => ({ c: [`${o.nom || "Objectif"}${o.date ? ` · ${o.date}` : ""}`, $(+o.cible || 0), o.atteint ? "atteint" : $(o.dedie ? o.mensuel : Math.max(0, o.mensuel - o.prevu))] })), "compact") : ""}
          <ul class="rp-jalons">${jal.map(j => `<li><b>${esc(j.jalon.mois ? `${j.jalon.mois} ${j.jalon.annee}` : j.jalon.annee)}</b><span>${esc(j.titre)}</span></li>`).join("")}</ul></div>
      </div>
      <p class="rp-avis">Estimations seulement : ni avis fiscal, ni avis financier. Rapport complet : page Données de WealthMorand.</p>`);
  }

  /* Sommaire pour le comptable : sur une page, ce qu'il faut pour les déclarations de l'année
     (revenus, déductions, impôt estimé, échéances, documents à rassembler, points à valider). */
  // En résidence : un salarié (T4 et relevé 1), sa part des droits de scolarité, et l'année de transition à venir.
  function comptableResidence(S, R, date) {
    const AN_IMPOT = R.parametres.annee;   // année des paramètres d'impôt du plan
    const I = R.impot, x = R.res, P = O.votreP(), suivante = AN_IMPOT + 1, reer = S.epargne.reer.cotisationAnnuelle, celiapp = R.celiappAnnee(0);
    const union = !R.couple ? "Sans partenaire" : S.conjointe.lien === "fait" ? (R.coupleFiscal ? "Union de fait : couple pour l'impôt" : "Union de fait de moins de 12 mois : chaque personne imposée seule") : "Mariage ou union civile";
    const revenus = [
      { c: [`Salaire de résident, R${x.niveau} (T4, relevé 1)`, $(x.salaire)] },
      ...(x.garde + x.enseignement > 0 ? [{ c: ["Primes de responsabilité", $(x.garde + x.enseignement)] }] : []),
      ...(x.autres > 0 ? [{ c: ["Autres revenus d'emploi", $(x.autres)] }] : []),
      ...(I.autres > 0.5 ? [{ c: ["Autres revenus imposables", $(I.autres)] }] : []),
      ...(x.syndicat > 0 ? [{ c: ["Cotisation syndicale (déduction)", moins(x.syndicat)] }] : []),
      ...(reer > 0.5 ? [{ c: ["Déduction REER", moins(reer)] }] : []),
      ...(celiapp > 0.5 ? [{ c: ["Déduction CELIAPP", moins(celiapp)] }] : []),
      { cls: "total", c: ["Revenu imposable fédéral", $(I.imposable)] },
      { cls: "sous", c: ["Revenu imposable du Québec", $(I.imposableQc)] },
    ];
    const impots = [
      { c: ["Impôt fédéral (après l'abattement)", $(I.fed)] }, { c: ["Impôt du Québec", $(I.qc)] },
      { c: ["RRQ, RQAP et assurance-emploi", $(I.rrq + I.rqap + I.ae)] },
      ...(I.transferts > 0.5 ? [{ cls: "sous", c: [`Crédits transférés par ${P}, déjà déduits`, $(I.transferts)] }] : []),
      { cls: "total", c: ["Impôt et cotisations, retenus sur la paie", $(I.total)] },
      ...(R.primeMoi > 0.5 ? [{ c: ["Prime d'assurance médicaments (Québec), avec la déclaration", $(R.primeMoi)] }] : []),
      { cls: "sous", c: ["Taux moyen ; taux marginal", `${pct(I.tauxMoyen, 0)} ; ${pct(R.tauxMarginal, 0)}`] },
    ];
    const echeances = [
      { c: ["Acomptes provisionnels", "aucun : retenues sur la paie"] },
      ...(reer > 0 || S.epargne.reer.droits > 0 ? [{ c: [`1er mars ${suivante} : limite REER`, reer > 0 ? $(reer) : "—"] }] : []),
      { c: [`30 avril ${suivante} : déclarations et solde, s'il y a lieu`, ""] },
      { c: [`${moisLong(R.debutPratique)} : début de la pratique`, "année de transition"] },
    ];
    const documents = [
      `Établissement : feuillet T4 et relevé 1 de ${AN_IMPOT} (salaire, primes, retenues, cotisation syndicale).`,
      x.scolarite > 0 && `Université : formulaire T2202 et relevé 8 (droits de scolarité, environ ${$(x.scolarite)}).`,
      (reer > 0.5 || celiapp > 0.5) && [reer > 0.5 && `REER : reçus pour ${AN_IMPOT} (jusqu'au 1er mars ${suivante})`, celiapp > 0.5 && "CELIAPP : relevé des cotisations"].filter(Boolean).join(" ; ") + ".",
      R.interetsEtudes > 0.5 && `Prêt étudiant : relevé des intérêts (${$(R.interetsEtudes)}).`,
      I.autres > 0.5 && "Revenus de placement et de location : feuillets.",
      R.couple && R.conjointe && R.conjointe.revenu > 0.5 && `${P.charAt(0).toUpperCase() + P.slice(1)} : ses feuillets.`,
    ].filter(Boolean);
    const points = [
      `Année de transition : en ${R.debutPratique.slice(0, 4)}, un salaire de résident, puis un revenu d'entreprise dès ${moisLong(R.debutPratique)}. Aucun acompte la première année ; le solde arrive le 30 avril suivant.`,
      S.epargne.reer.droits > 0 ? `REER : droits de ${$(S.epargne.reer.droits)}. Les garder pour la pratique, au taux marginal plus élevé, rapporte souvent plus qu'une déduction en résidence (${pct(R.tauxMarginal, 0)}).` : null,
      R.interetsEtudes > 0.5 ? "Intérêts du prêt étudiant : crédit reportable s'il n'est pas utile cette année." : null,
    ].filter(Boolean);
    return page("Sommaire pour le comptable", `Année d'imposition ${AN_IMPOT} · préparé le ${date} · ${libelleRevenu()} · salarié. ${union}. Montants estimés : les relevés officiels font foi.`, `
      <div class="rp-deux">
        <div class="rp-carte"><h2>Revenus et déductions</h2>${tableau(["", "Année"], revenus, "compact")}</div>
        <div class="rp-carte"><h2>Impôt estimé ${AN_IMPOT}</h2>${tableau(["", "Année"], impots, "compact")}</div>
      </div>
      <div class="rp-deux">
        <div class="rp-carte"><h2>Échéances</h2>${tableau(["", ""], echeances, "compact")}</div>
        <div class="rp-carte"><h2>Points à valider</h2><ul class="rp-points serre">${points.map(d => `<li>${esc(d)}</li>`).join("")}</ul></div>
      </div>
      <div class="rp-carte"><h2>Documents à rassembler</h2><ul class="rp-points serre deux-colonnes">${documents.map(d => `<li>${esc(d)}</li>`).join("")}</ul></div>
      <p class="rp-avis">Estimations faites avec les paramètres fiscaux ${AN_IMPOT} : elles ne remplacent ni les relevés officiels ni l'avis d'un comptable.</p>`);
  }
  function comptable(S, R, date) {
    if (R.vueResidence) return comptableResidence(S, R, date);
    const AN_IMPOT = R.parametres.annee;
    const I = R.impot, soc = R.societeActive, g = R.rev[R.mode], x = I.societe, perso = I.total, premiere = S.revenu.annee === "premiere";
    const P = O.votreP(), suivante = AN_IMPOT + 1;
    const frais = soc ? 0 : g.fraisCabinet, reer = S.epargne.reer.cotisationAnnuelle, celiapp = R.celiappAnnee(0);
    const proDetail = S.impot.depensesProMode === "detail" ? S.impot.depensesProDetail.filter(l => O.annuelLigne(l) > 0) : [];
    const pro = k => proDetail.some(l => l.k === k);
    // Dépenses du budget (ménage) qui demandent des reçus.
    const budget = new Map();
    for (const b of O.depensesEffectives()) if (b.k) budget.set(b.k, (budget.get(b.k) || 0) + O.mensuel(b) * 12);
    const somme = cles => cles.reduce((t, k) => t + (budget.get(k) || 0), 0);
    const medicaux = ["dentiste", "orthodontie", "lunettes", "medicaments", "assuranceSante"].filter(k => budget.get(k) > 0);
    const union = !R.couple ? "Personne seule" : S.conjointe.lien === "fait"
      ? (R.coupleFiscal ? "Union de fait : couple pour l'impôt" : "Union de fait de moins de 12 mois : chaque personne imposée seule") : "Mariage ou union civile";
    const enfants = R.ages.length ? `${R.ages.length} enfant${R.ages.length > 1 ? "s" : ""} de moins de 18 ans (${R.ages.join(", ")} ans)` : "aucun enfant à charge";

    const revenus = soc ? [
      { c: ["Revenus versés à la société", $(I.revenu)] },
      { c: ["Dépenses et frais de la société", moins(x.depenses + x.frais)] },
      { cls: "sous-total", c: ["Bénéfice de la société", $(x.profit)] },
      { c: ["Impôt de la société", moins(x.impotSociete)] },
      { c: ["Dividendes non déterminés versés", $(x.dividendes)] },
      { cls: "sous", c: ["Laissé dans la société", $(x.retenu)] },
      ...(I.autres > 0.5 ? [{ c: ["Autres revenus imposables", $(I.autres)] }] : []),
      ...(reer + celiapp > 0.5 ? [{ c: ["Déduction REER et CELIAPP", moins(reer + celiapp)] }] : []),
      { cls: "total", c: ["Revenu imposable (dividendes majorés)", $(I.imposable)] },
    ] : (() => {
      const netAffaires = Math.max(0, I.revenu - frais - R.depensesPro);
      const cotis = Math.max(0, netAffaires + I.autres - reer - celiapp - I.imposable);
      return [
        { c: ["Rémunération de la RAMQ (estimée)", $(I.revenu - (g.autres || 0))] },
        ...(g.autres > 0.5 ? [{ c: ["Autres revenus professionnels", $(g.autres)] }] : []),
        ...(frais > 0.5 ? [{ c: ["Frais de cabinet payés à la clinique", moins(frais)] }] : []),
        { c: ["Dépenses professionnelles", moins(R.depensesPro)] },
        { cls: "sous-total", c: ["Revenu net d'entreprise", $(netAffaires)] },
        ...(I.autres > 0.5 ? [{ c: ["Autres revenus imposables", $(I.autres)] }] : []),
        ...(reer > 0.5 ? [{ c: ["Déduction REER", moins(reer)] }] : []),
        ...(celiapp > 0.5 ? [{ c: ["Déduction CELIAPP", moins(celiapp)] }] : []),
        ...(cotis > 0.5 ? [{ c: ["Déduction pour RRQ et RQAP", moins(cotis)] }] : []),
        { cls: "total", c: ["Revenu imposable fédéral", $(I.imposable)] },
        { cls: "sous", c: ["Revenu imposable du Québec", $(I.imposableQc)] },
      ];
    })();
    const impots = [
      { c: ["Impôt fédéral (après l'abattement)", $(I.fed)] },
      { c: ["Impôt du Québec", $(I.qc)] },
      ...(soc ? [] : [{ c: ["RRQ (deux parts)", $(I.rrq)] }, { c: ["RQAP", $(I.rqap)] }]),
      { c: ["Fonds des services de santé", $(I.fss)] },
      ...(I.transferts > 0.5 ? [{ cls: "sous", c: [`Crédits transférés par ${P}, déjà déduits`, $(I.transferts)] }] : []),
      { cls: "total", c: [soc ? "Votre impôt sur les dividendes" : "Impôt et cotisations", $(perso)] },
      ...(soc ? [{ c: ["Impôt de la société", $(x.impotSociete)] }, { cls: "sous-total", c: ["Total, société comprise", $(I.totalGlobal)] }] : []),
      ...(R.primeMoi > 0.5 ? [{ c: ["Prime d'assurance médicaments (Québec)", $(R.primeMoi)] }] : []),
      { cls: "sous", c: ["Taux moyen ; taux marginal", `${pct(I.tauxMoyen, 0)} ; ${pct(R.tauxMarginal, 0)}`] },
      ...(R.couple && R.conjointe ? [{ cls: "sous", c: [`Revenu de ${P}`, $(R.conjointe.revenu)] }] : []),
      ...(R.couple && R.conjointe && R.conjointe.total > 0.5 ? [{ cls: "sous", c: [`Impôt et cotisations de ${P}`, $(R.conjointe.total)] }] : []),
    ];
    const echeances = [
      premiere ? { c: [`Acomptes ${AN_IMPOT} : aucun (1re année)`, "—"] } : { c: [`Acomptes ${AN_IMPOT} (15 mars, juin, sept., déc.), prime comprise`, `4 × ${$((perso + R.primeMoi) / 4)}`] },
      ...(soc ? [{ c: ["Société : acomptes mensuels", $(x.impotSociete / 12)] }] : []),
      ...(reer > 0 || S.epargne.reer.droits > 0 ? [{ c: [`1er mars ${suivante} : limite REER`, reer > 0 ? $(reer) : "—"] }] : []),
      { c: [`30 avril ${suivante} : solde de l'impôt`, premiere ? $(perso) : "s'il y a lieu"] },
      { c: [`${soc ? "30 avril" : "15 juin"} ${suivante} : déclarations`, ""] },
      ...(soc ? [{ c: ["Société : T2 et CO-17, 6 mois après l'exercice", ""] }] : []),
    ];
    const lignesPro = proDetail.map(l => [O.ITEMS_PRO.get(l.k).nom.split(" : ")[0], O.annuelLigne(l)]).sort((a, b) => b[1] - a[1]);
    const listePro = lignesPro.slice(0, 3).map(([n, v]) => `${n} ${$(v)}`).join(", ") + (lignesPro.length > 3 ? ", etc." : "");
    const documents = [
      soc ? "Société : états financiers ; feuillets des dividendes (T5, relevé 3)." : `RAMQ : relevés et états de compte de ${AN_IMPOT}.`,
      frais > 0.5 && `Frais de cabinet : relevé de la clinique (${$(frais)}).`,
      R.depensesPro > 0.5 && (lignesPro.length ? `Dépenses professionnelles : reçus (${listePro})` : `Dépenses professionnelles : reçus (environ ${$(R.depensesPro)})`)
        + (pro("auto") ? " ; registre de l'auto (km)" : "") + (pro("bureau") ? " ; bureau à domicile (superficie, frais)" : "") + ".",
      (reer > 0.5 || celiapp > 0.5) && [reer > 0.5 && `REER : reçus pour ${AN_IMPOT} (jusqu'au 1er mars ${suivante})`, celiapp > 0.5 && "CELIAPP : relevé des cotisations"].filter(Boolean).join(" ; ") + ".",
      R.interetsEtudes > 0.5 && `Prêt étudiant : relevé des intérêts (${$(R.interetsEtudes)}).`,
      I.autres > 0.5 && "Revenus de placement et de location : feuillets.",
      budget.get("garderie") > 0 && `Frais de garde : reçus, relevé 24 (${$(budget.get("garderie"))} au budget ; crédit du Québec estimé à ${$(R.garde.creditQc)}${R.garde.deduction > 0 ? `, déduction fédérale de ${$(R.garde.deduction)}` : ""}).`,
      medicaux.length && `Frais médicaux et assurance santé : reçus (${$(somme(medicaux))} au budget).`,
      budget.get("dons") > 0 && "Dons : reçus officiels.",
      budget.get("fraisPlacements") > 0 && "Frais de gestion des placements non enregistrés : relevés.",
      R.couple && R.conjointe && R.conjointe.revenu > 0.5 && (R.autonomeP ? `${P.charAt(0).toUpperCase() + P.slice(1)} : revenus et dépenses d'entreprise.`
        : `${P.charAt(0).toUpperCase() + P.slice(1)} : feuillets T4 et relevé 1${S.conjointe.autresRevenus > 0 ? ", et ses autres revenus" : ""}.`),
    ].filter(Boolean);
    const points = [];
    if (premiere) points.push(`Première année de pratique : aucun acompte exigé ; environ ${$(perso + R.primeMoi)} à payer le 30 avril ${suivante}, prime d'assurance médicaments comprise.`);
    // Cotiser tous les droits plutôt que la cotisation prévue : ce que l'impôt baisserait de plus.
    const droits = S.epargne.reer.droits;
    if (droits > reer) {
      const plus = R.impotAvecReer(reer + celiapp) - R.impotAvecReer(droits + celiapp);
      points.push(`REER : droits inutilisés de ${$(droits)}${reer > 0 ? ` (cotisation prévue : ${$(reer)})` : ""}. Tout cotiser réduirait l'impôt ${AN_IMPOT} d'environ ${$(plus)} de plus.`);
    }
    if (!soc && R.societe && R.societe.reportAnnuel > 500)
      points.push(`Société professionnelle : report d'impôt estimé à ${$(R.societe.reportAnnuel)} cette année, après ${$(S.societe.fraisSociete)} de frais.`);
    if (soc) points.push("Rémunération en dividendes seulement : un salaire serait-il préférable (RRQ, droits REER) ?");
    if (R.couple && !R.coupleFiscal) points.push(`Conjoints de fait depuis moins de 12 mois : vous et ${P} êtes imposés comme des personnes seules pour ${AN_IMPOT}.`);
    if (I.transferts > 0.5 || (R.conjointe && R.conjointe.transferts > 0.5)) points.push(`Transfert de crédits entre conjoints estimé : ${$(I.transferts + R.conjointe.transferts)}.`);

    return page("Sommaire pour le comptable", `Année d'imposition ${AN_IMPOT} · préparé le ${date} · ${libelleRevenu()}${soc ? " · pratique incorporée" : " · travailleur autonome"}. ${union} ; ${enfants}. Montants estimés : les relevés officiels font foi.`, `
      <div class="rp-deux">
        <div class="rp-carte"><h2>${soc ? "Société et revenus" : "Revenus et déductions"}</h2>${tableau(["", "Année"], revenus, "compact")}</div>
        <div class="rp-carte"><h2>Impôt estimé ${AN_IMPOT}</h2>${tableau(["", "Année"], impots, "compact")}</div>
      </div>
      <div class="rp-deux">
        <div class="rp-carte"><h2>Échéances</h2>${tableau(["", "Montant"], echeances, "compact")}</div>
        ${points.length ? `<div class="rp-carte"><h2>Points à valider</h2><ul class="rp-points serre">${points.map(d => `<li>${esc(d)}</li>`).join("")}</ul></div>` : ""}
      </div>
      <div class="rp-carte"><h2>Documents à rassembler</h2><ul class="rp-points serre deux-colonnes">${documents.map(d => `<li>${esc(d)}</li>`).join("")}</ul></div>
      <p class="rp-avis">Estimations faites avec les paramètres fiscaux ${AN_IMPOT} : elles ne remplacent ni les relevés officiels ni l'avis d'un comptable. Les acomptes à payer sont ceux des rappels de l'Agence du revenu du Canada et de Revenu Québec.</p>`);
  }

  function imprimer(opts = {}) {
    construire(opts);
    document.body.classList.add("impression-rapport");
    const fin = () => { document.body.classList.remove("impression-rapport"); document.getElementById("rapport").textContent = ""; window.removeEventListener("afterprint", fin); };
    window.addEventListener("afterprint", fin);
    // Laisse le temps au navigateur de mettre le rapport en page.
    setTimeout(() => window.print(), 60);
  }
  W.rapport = { construire, imprimer };
});
