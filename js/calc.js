/* Boussole — moteur de calcul.
   Fonctions pures, sans accès à la page : elles reçoivent l'état et
   rendent des nombres. Chargé tel quel par la page et par Node pour les
   vérifications. */
(function (racine) {
  "use strict";

  /* ---------- Paramètres publics 2026 ---------- */
  const P2026 = {
    federal: {
      tranches: [[58523, 0.14], [117045, 0.205], [181440, 0.26], [258482, 0.29], [Infinity, 0.33]],
      bpaMax: 16452, bpaMin: 14829,       // montant personnel de base, réduit entre les 4e et 5e seuils
      abattementQc: 0.165,
      tauxCredit: 0.14,
    },
    quebec: {
      tranches: [[54345, 0.14], [108680, 0.19], [132245, 0.24], [Infinity, 0.2575]],
      montantBase: 18952,
      tauxCredit: 0.14,
    },
    // RRQ du travailleur autonome : il paie les deux parts.
    rrq: { mga: 74600, mgs: 85000, exemption: 3500, base: 0.106, supp1: 0.02, supp2: 0.08 },
    rqap: { max: 103000, autonome: 0.00764, salarie: 0.0043 },
    // Crédits pour les intérêts d'un prêt du programme d'aide financière aux études.
    creditInteretsEtudes: { federal: 0.14, quebec: 0.20 },
    // Dividendes non déterminés (société qui profite du taux des PME).
    dividendes: { majoration: 0.15, creditFederal: 0.090301, creditQuebec: 0.0342 },
  };

  /* ---------- Tarifs RAMQ, onglet B (6 août 2026), colonne CLSC / GMF-U ----------
     [moins de 500 inscrits, 500 inscrits ou plus], patient de moins de 80 ans. */
  const VISITES = [
    { cle: "suivi",  nom: "Suivi",                                 tarifs: [32.25, 36.95] },
    { cle: "suiviV", nom: "Suivi, patient vulnérable",             tarifs: [40.50, 45.20] },
    { cle: "perioV", nom: "Visite périodique, patient vulnérable", tarifs: [72.65, 84.80] },
    { cle: "pedia",  nom: "Visite périodique pédiatrique",         tarifs: [50.30, 57.00] },
    { cle: "gross",  nom: "Suivi de grossesse",                    tarifs: [37.75, 42.85] },
  ];
  const PRISE_EN_CHARGE = { nonVuln: [64.50, 74.75], vuln: [72.65, 82.90] };

  /* ---------- Outils ---------- */
  const parTranches = (revenu, tranches) => {
    let impot = 0, bas = 0;
    for (const [haut, taux] of tranches) {
      if (revenu > bas) impot += (Math.min(revenu, haut) - bas) * taux;
      bas = haut;
    }
    return impot;
  };
  const borne = (x, min, max) => Math.min(max, Math.max(min, x));

  /* Tarif moyen d'une visite autre qu'une prise en charge, selon la
     répartition saisie (les proportions sont ramenées à 100 %). */
  function tarifVisite(mix, palier) {
    let somme = 0, poids = 0;
    for (const v of VISITES) {
      const w = Math.max(0, +mix[v.cle] || 0);
      somme += w * v.tarifs[palier];
      poids += w;
    }
    return poids > 0 ? somme / poids : 0;
  }

  /* ============================================================
     REVENU GMF-U : taux horaire et mode mixte
     ============================================================
     Simulation semaine par semaine pour suivre l'arrivée des nouveaux
     patients : le palier de 500 inscrits change le tarif des visites, et
     le forfait annuel d'un patient vulnérable n'est payé qu'à partir du
     mois de son inscription. */
  function revenuGmfu(r) {
    const W = Math.max(0, r.semaines), N = r.demiJournees, H = r.heuresParDJ;
    const T = Math.min(r.enseignement, N), C = Math.max(N - T, 0);
    const heuresSup = Math.min(H, r.supervisionMaxH);
    const v = r.partVulnerable / 100;
    const premiere = r.annee === "premiere";

    const nouveaux = premiere ? r.nouveauxGuichet + r.nouveauxSansMedecin + r.nouveauxTransferes : 0;
    const etalement = Math.max(1, Math.min(W, r.semainesArrivee || W));
    let inscrits = premiere ? r.inscritsDebut : r.inscritsDebut + r.nouveauxGuichet + r.nouveauxSansMedecin + r.nouveauxTransferes;
    const inscritsDepart = inscrits;

    let visitesMixte = 0, nbVisites = 0, nbPriseEnCharge = 0, forfaitVulnNouveaux = 0, semainesPalierHaut = 0;
    for (let k = 0; k < W; k++) {
      const palier = inscrits >= 499.999 ? 1 : 0;
      if (palier) semainesPalierHaut++;
      const arrivees = k < etalement ? nouveaux / etalement : 0;
      const visitesSem = C * r.patientsParDJ;
      const pec = Math.min(arrivees, visitesSem);
      const tarifPec = (1 - v) * PRISE_EN_CHARGE.nonVuln[palier] + v * PRISE_EN_CHARGE.vuln[palier];
      visitesMixte += pec * tarifPec + (visitesSem - pec) * tarifVisite(r.mix, palier);
      visitesMixte += T * r.patientsPendantSupervision * tarifVisite(r.mix, palier);
      nbVisites += visitesSem + T * r.patientsPendantSupervision;
      nbPriseEnCharge += pec;
      // Forfait vulnérable : payé à partir du mois d'inscription (EP 40, par. 6.01).
      const mois = Math.floor((k / W) * 12);
      forfaitVulnNouveaux += arrivees * v * r.forfaitVulnerable * (12 - mois) / 12;
      inscrits += arrivees;
    }
    const inscritsFin = inscrits;

    // Forfaits et suppléments : identiques dans les deux modes.
    const forfaitInscription = inscritsFin * r.forfaitInscription;   // payé en entier (EP 40, par. 4.08)
    const forfaitVulnerable = inscritsDepart * v * r.forfaitVulnerable + forfaitVulnNouveaux;
    let supplements = 0;
    if (premiere) {
      // Guichet : après 4 ans de pratique, le supplément majoré ne vaut que pour 150 patients par année (EP 40, par. 13.02).
      const guichetMajore = r.quatrePremieresAnnees ? r.nouveauxGuichet : Math.min(150, r.nouveauxGuichet);
      supplements += r.nouveauxGuichet * (1 - v) * r.suppNonVulnerable;
      supplements += guichetMajore * v * r.suppVulnerableGuichet;
      supplements += (r.nouveauxGuichet - guichetMajore) * v * r.suppVulnerableHorsGuichet;
      supplements += r.nouveauxSansMedecin * ((1 - v) * r.suppNonVulnerable + v * r.suppVulnerableHorsGuichet);
    }
    const perDiem = W * T * r.residents * r.perDiemResident;
    const commun = forfaitInscription + forfaitVulnerable + supplements + perDiem + (r.autresRevenus || 0);

    const heures = W * N * H;
    const horaire = { heures: heures * r.tarifHoraire, perDiem, forfaitInscription, forfaitVulnerable, supplements, autres: r.autresRevenus || 0 };
    horaire.total = horaire.heures + commun;
    const mixte = {
      forfaitHoraire: heures * r.forfaitHoraireMixte,
      visites: visitesMixte * r.pctMixte / 100,
      supervision: W * T * heuresSup * r.acteSupervision * r.pctSupervision / 100,
      perDiem, forfaitInscription, forfaitVulnerable, supplements, autres: r.autresRevenus || 0,
    };
    mixte.total = mixte.forfaitHoraire + mixte.visites + mixte.supervision + commun;

    // Seuil : nombre de patients par demi-journée clinique où le mixte égale l'horaire.
    const parVisite = tarifVisite(r.mix, inscritsFin >= 499.999 ? 1 : 0) * r.pctMixte / 100;
    const seuil = parVisite > 0 ? (r.tarifHoraire - r.forfaitHoraireMixte) * H / parVisite : null;

    return { heures, nbVisites, nbPriseEnCharge, inscritsDepart, inscritsFin, semainesPalierHaut,
      horaire, mixte, ecart: mixte.total - horaire.total, seuilPatients: seuil };
  }

  /* ============================================================
     IMPÔT 2026 : particulier (travailleur autonome)
     ============================================================ */
  function cotisationsAutonome(revenuNet) {
    const q = P2026.rrq;
    const assiette = borne(revenuNet - q.exemption, 0, q.mga - q.exemption);
    const base = assiette * q.base, supp1 = assiette * q.supp1;
    const supp2 = borne(Math.min(revenuNet, q.mgs) - q.mga, 0, q.mgs - q.mga) * q.supp2;
    const assurable = borne(revenuNet, 0, P2026.rqap.max);
    const rqap = assurable * P2026.rqap.autonome;
    return {
      rrq: base + supp1 + supp2, rqap,
      deduction: base / 2 + supp1 + supp2 + assurable * (P2026.rqap.autonome - P2026.rqap.salarie),
      creditFederal: base / 2 + assurable * P2026.rqap.salarie,
    };
  }

  // Cotisation au Fonds des services de santé sur les revenus autres que d'emploi (approximation).
  const fss = revenu => revenu <= 17725 ? 0 : revenu <= 58000 ? Math.min(150, (revenu - 17725) * 0.01) : Math.min(1000, 150 + (revenu - 58000) * 0.01);

  function impotsDeBase(imposableFed, imposableQc, creditsFedMontant, creditsQcMontant, creditsFedDirects, creditsQcDirects) {
    const f = P2026.federal, q = P2026.quebec;
    const bpa = imposableFed <= f.tranches[2][0] ? f.bpaMax
      : imposableFed >= f.tranches[3][0] ? f.bpaMin
      : f.bpaMax - (f.bpaMax - f.bpaMin) * (imposableFed - f.tranches[2][0]) / (f.tranches[3][0] - f.tranches[2][0]);
    const fedBase = Math.max(0, parTranches(imposableFed, f.tranches) - (bpa + creditsFedMontant) * f.tauxCredit - creditsFedDirects);
    const fed = fedBase * (1 - f.abattementQc);
    const qc = Math.max(0, parTranches(imposableQc, q.tranches) - (q.montantBase + creditsQcMontant) * q.tauxCredit - creditsQcDirects);
    return { fed, qc };
  }

  /* Revenu de travail autonome (RAMQ), moins les dépenses et le REER.
     interetsEtudes : intérêts payés sur un prêt de l'aide financière aux études. */
  function impotParticulier(o) {
    const revenuNetAffaires = Math.max(0, o.revenu - (o.depensesPro || 0));
    const c = cotisationsAutonome(revenuNetAffaires);
    const imposable = Math.max(0, revenuNetAffaires - c.deduction - (o.reer || 0));
    const ie = o.interetsEtudes || 0;
    const { fed, qc } = impotsDeBase(imposable, imposable, c.creditFederal, 0,
      ie * P2026.creditInteretsEtudes.federal, ie * P2026.creditInteretsEtudes.quebec);
    const cotisationFss = fss(revenuNetAffaires);
    const total = fed + qc + c.rrq + c.rqap + cotisationFss;
    return { revenu: o.revenu, imposable, fed, qc, rrq: c.rrq, rqap: c.rqap, fss: cotisationFss, total,
      net: o.revenu - total, tauxMoyen: o.revenu > 0 ? total / o.revenu : 0 };
  }

  // Taux marginal : impôt et cotisations sur 1 000 $ de plus.
  function tauxMarginal(o) {
    const a = impotParticulier(o), b = impotParticulier({ ...o, revenu: o.revenu + 1000 });
    return (b.total - a.total) / 1000;
  }
  // Économie d'impôt d'une cotisation REER (remboursement attendu).
  function remboursementReer(o, cotisation) {
    return impotParticulier({ ...o, reer: (o.reer || 0) }).total - impotParticulier({ ...o, reer: (o.reer || 0) + cotisation }).total;
  }

  /* ---------- Société : rémunération en dividendes non déterminés ---------- */
  function impotDividendes(dividendes, autresRevenus) {
    const d = P2026.dividendes;
    const majore = dividendes * (1 + d.majoration);
    const imposable = majore + (autresRevenus || 0);
    const { fed, qc } = impotsDeBase(imposable, imposable, 0, 0, majore * d.creditFederal, majore * d.creditQuebec);
    return { fed, qc, total: fed + qc, net: dividendes - fed - qc };
  }
  /* Compare le particulier et une société qui verse seulement les
     dividendes nécessaires pour fournir `besoinNet` au ménage. Le reste
     reste dans la société, imposé au taux des PME : c'est un report, pas
     une économie définitive. */
  function comparerSociete(o) {
    const part = impotParticulier(o);
    const profit = Math.max(0, o.revenu - (o.depensesPro || 0) - o.fraisSociete);
    const impotSociete = profit * o.tauxSociete;
    const disponible = profit - impotSociete;
    // Dividende nécessaire pour obtenir le besoin net (recherche binaire).
    let bas = 0, haut = disponible;
    for (let i = 0; i < 60; i++) {
      const milieu = (bas + haut) / 2;
      if (impotDividendes(milieu).net < o.besoinNet) bas = milieu; else haut = milieu;
    }
    const dividendes = Math.min(disponible, haut);
    const perso = impotDividendes(dividendes);
    const retenu = disponible - dividendes;
    return {
      particulier: { impot: part.total, net: part.net, apresBesoin: part.net - o.besoinNet },
      societe: { profit, impotSociete, dividendes, impotPerso: perso.total, netPerso: perso.net, retenu,
        impot: impotSociete + perso.total, fraisSociete: o.fraisSociete,
        suffisant: perso.net >= o.besoinNet - 1 },
      reportAnnuel: part.total - (impotSociete + perso.total) - o.fraisSociete,
    };
  }

  /* ============================================================
     DETTES : simulation mois par mois
     ============================================================
     methode : "minimum" (aucun extra), "avalanche" (taux réel le plus
     élevé d'abord) ou "boule" (plus petit solde d'abord). Hors mode
     « minimum », le budget mensuel des dettes reste fixe : les paiements
     minimums du départ plus l'extra. Ce qu'une dette remboursée ou des
     intérêts en baisse libèrent va donc à la dette suivante. Les
     hypothèques acceptent au plus `privilege` % de leur solde au
     1er janvier en paiements anticipés par année civile, sauf au mois de
     chaque renouvellement (fin du terme, puis tous les `dureeTerme` ans).
     Au renouvellement, le paiement ne change pas : seul le taux change. */
  // Taux réel : taux en vigueur (après un renouvellement), moins le crédit d'impôt sur les intérêts.
  function tauxReel(d) { return (d.tauxCourant ?? d.taux) * (1 - (d.creditImpot || 0) / 100); }

  function simulerDettes(dettes, o) {
    const debut = new Date(o.debut + "-01T00:00:00");
    const ds = dettes.map(d => ({
      ...d, s: Math.max(0, +d.solde || 0), interets: 0, interetsNets: 0, fin: null, tauxCourant: d.taux,
      paiementMensuel: d.frequence === "2sem" ? d.paiement * 26 / 12 : d.paiement,
      finTerme: d.finTerme ? new Date(d.finTerme + "T00:00:00") : null,
      privilegeRestant: Infinity,
    }));
    const mois = [], parAn = [];
    let interetsTotaux = 0, interetsNetsTotaux = 0, extraLibre = 0, reserve = 0;
    const max = o.moisMax || 480;
    const minimumsDepart = ds.reduce((a, d) => a + (d.interetsSeulement ? d.s * d.taux / 100 / 12 : d.paiementMensuel), 0);
    const budget = o.methode === "minimum" ? null : minimumsDepart + (o.extraMensuel || 0);
    for (let m = 0; m < max; m++) {
      const date = new Date(debut.getFullYear(), debut.getMonth() + m, 1);
      if (date.getMonth() === 0 || m === 0) {
        ds.forEach(d => { d.privilegeRestant = d.type === "hypotheque" ? d.s * (d.privilege || 0) / 100 : Infinity; });
      }
      let interetsMois = 0, interetsEtudes = 0, minimumsPayes = 0;
      for (const d of ds) {
        if (d.s <= 0.005) continue;
        const renouvele = d.finTerme && date >= d.finTerme;
        d.tauxCourant = renouvele && d.tauxRenouvellement ? d.tauxRenouvellement : d.taux;
        const i = d.s * d.tauxCourant / 100 / 12;
        d.interets += i; interetsMois += i;
        d.interetsNets += i * (1 - (d.creditImpot || 0) / 100);
        interetsNetsTotaux += i * (1 - (d.creditImpot || 0) / 100);
        if (d.creditImpot) interetsEtudes += i;
        const paye = Math.min(d.s + i, d.interetsSeulement ? i : d.paiementMensuel);
        minimumsPayes += paye;
        d.s = d.s + i - paye;
        if (d.s <= 0.005) { d.s = 0; d.fin = d.fin || date; }
      }
      // L'extra qui n'a pas pu être versé (plafond de remboursement anticipé
      // atteint) est mis de côté et versé dès que possible : en janvier ou
      // au renouvellement.
      let extra = budget === null ? 0 : Math.max(0, budget - minimumsPayes) + reserve;
      if (budget !== null && o.forfaitsAnnuels && date.getMonth() === (o.moisForfait ?? 3)) extra += o.forfaitsAnnuels;
      // Répartition de l'extra.
      const ordre = ds.filter(d => d.s > 0.005).sort((a, b) =>
        o.methode === "boule" ? a.s - b.s : tauxReel(b) - tauxReel(a));
      for (const d of ordre) {
        if (extra <= 0) break;
        // Renouvellement à la fin du terme, puis à chaque nouveau terme (5 ans par défaut) :
        // le remboursement anticipé n'y a pas de plafond.
        const moisDepuis = d.finTerme ? (date.getFullYear() - d.finTerme.getFullYear()) * 12 + date.getMonth() - d.finTerme.getMonth() : -1;
        const auMoisRenouvellement = moisDepuis >= 0 && moisDepuis % (12 * (d.dureeTerme || 5)) === 0;
        const plafond = d.type === "hypotheque" && !auMoisRenouvellement ? d.privilegeRestant : Infinity;
        const verse = Math.min(extra, d.s, plafond);
        d.s -= verse; extra -= verse;
        if (d.type === "hypotheque" && !auMoisRenouvellement) d.privilegeRestant -= verse;
        if (d.s <= 0.005) { d.s = 0; d.fin = d.fin || date; }
      }
      const resteDesDettes = ds.some(d => d.s > 0.005);
      reserve = resteDesDettes ? extra : 0;
      extraLibre = resteDesDettes ? 0 : extra;
      interetsTotaux += interetsMois;
      mois.push({ date, soldes: ds.map(d => d.s), total: ds.reduce((a, d) => a + d.s, 0), extraLibre, interetsEtudes });
      if (ds.every(d => d.s <= 0.005) && (o.continuerApres ? m >= (o.continuerApres - 1) : true)) break;
    }
    // Intérêts sur les prêts d'études par année civile (pour le crédit d'impôt).
    for (const x of mois) {
      const a = x.date.getFullYear();
      const e = parAn.find(p => p.annee === a) || (parAn.push({ annee: a, interetsEtudes: 0 }), parAn[parAn.length - 1]);
      e.interetsEtudes += x.interetsEtudes;
    }
    const libre = ds.every(d => d.s <= 0.005) ? mois[mois.length - 1].date : null;
    return { mois, dettes: ds.map(d => ({ id: d.id, nom: d.nom, fin: d.fin, interets: d.interets, interetsNets: d.interetsNets })),
      interetsTotaux, interetsNetsTotaux, libre, parAn };
  }

  /* ============================================================
     ÉPARGNE : REEE, REER, CELI
     ============================================================ */
  /* REEE : subvention fédérale de 20 % (500 $ par an, 7 200 $ à vie) et
     québécoise de 10 % (250 $ par an, 3 600 $ à vie), sur les cotisations
     jusqu'à 17 ans. */
  function projeterReee(e, rendement) {
    return e.enfants.map(enf => {
      let solde = +enf.solde || 0, sv = +enf.subventionsRecues || 0, svq = 0, cot = 0;
      const ans = Math.max(0, 17 - enf.age);
      for (let a = 0; a < ans; a++) {
        const c = e.cotisationAnnuelle;
        const f = Math.min(c * 0.20, 500, Math.max(0, 7200 - sv));
        const q = Math.min(c * 0.10, 250, Math.max(0, 3600 - svq));
        sv += f; svq += q; cot += c;
        solde = solde * (1 + rendement) + c + f + q;
      }
      return { age: enf.age, ans, solde, cotisations: cot, subventions: sv + svq };
    });
  }

  /* Valeur nette projetée par année, à partir de la simulation des dettes. */
  function projeterValeurNette(o, simulation) {
    const ans = o.annees || 20, r = o.rendement / 100;
    const res = [];
    let reer = o.reer.solde, celi = o.celi.solde, encaisse = o.encaisse || 0;
    for (let a = 0; a <= ans; a++) {
      const idx = Math.min(simulation.mois.length - 1, a * 12);
      const m = simulation.mois[idx];
      const soldes = a * 12 < simulation.mois.length ? m.soldes : m.soldes.map(() => 0);
      // Après la dernière dette, l'extra libéré est investi (CELI).
      const extraAnnuel = a * 12 >= simulation.mois.length ? o.extraApresDettes * 12 : 0;
      let detteMoi = 0, detteMenage = 0, hypotheque = 0;
      o.dettes.forEach((d, i) => {
        detteMenage += soldes[i];
        detteMoi += soldes[i] * (d.partMoi ?? 100) / 100;
        if (d.type === "hypotheque") hypotheque += soldes[i];
      });
      const maison = o.maison.valeur * Math.pow(1 + o.maison.croissance / 100, a);
      const voiture = o.voiture.valeur * Math.pow(1 - o.voiture.depreciation / 100, a);
      const moi = maison * o.maison.part / 100 + voiture + reer + celi + encaisse - detteMoi;
      const menage = maison + voiture + reer + celi + encaisse + (o.actifsConjoint || 0) - detteMenage;
      res.push({ annee: o.anneeDepart + a, moi, menage, maison, hypotheque, dettes: detteMenage, reer, celi });
      reer = reer * (1 + r) + o.reer.cotisationAnnuelle;
      celi = celi * (1 + r) + o.celi.cotisationAnnuelle + extraAnnuel;
    }
    return res;
  }

  const Calc = { P2026, VISITES, PRISE_EN_CHARGE, tarifVisite, revenuGmfu, impotParticulier, tauxMarginal,
    remboursementReer, impotDividendes, comparerSociete, simulerDettes, tauxReel, projeterReee, projeterValeurNette };
  if (typeof module !== "undefined" && module.exports) module.exports = Calc;
  else racine.Calc = Calc;
})(typeof window !== "undefined" ? window : globalThis);
