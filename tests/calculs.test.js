/* Tests des calculs de WealthMorand, sans dépendance : node tests/calculs.test.js
   Vérifie l'impôt contre l'outil officiel du ministère des Finances du Québec,
   les formules hypothécaires canadiennes, la simulation des dettes et la
   projection de la valeur nette. Aucune donnée personnelle : cas fictifs. */
"use strict";
const fs = require("fs");
const path = require("path");
const C = require("../js/calc.js");

let echecs = 0, reussis = 0;
function verifier(nom, condition, detail) {
  if (condition) reussis++;
  else { echecs++; console.error(`ÉCHEC : ${nom}${detail ? ` (${detail})` : ""}`); }
}
const proche = (a, b, tol) => Math.abs(a - b) <= tol;

/* 1. Impôt, cotisations, allocations et prime : cas de l'outil officiel (mai 2026). */
const app = fs.readFileSync(path.join(__dirname, "../js/app.js"), "utf8");
const VERIFICATION = JSON.parse(app.match(/const VERIFICATION = (\[.*?\]);\n/s)[1]);
let maxEcart = 0;
for (const v of VERIFICATION) {
  let a = C.impotSalarie({ salaire: v.salaires[0] }), b = v.couple ? C.impotSalarie({ salaire: v.salaires[1] }) : null;
  if (v.couple) [a, b] = C.transfertsConjoints(a, b);
  const somme = k => a[k] + (b ? b[k] : 0);
  const pf = C.prestationsFamille({ revenuNetFed: somme("revenuNetFed"), revenuNetQc: somme("revenuNetQc"), ages: v.ages, couple: v.couple });
  const pr = C.primeMedicaments({ revenuNetQc: somme("revenuNetQc"), couple: v.couple, ages: v.ages, adultesCouverts: v.couple ? 2 : 1 });
  const nous = { qc: somme("qc"), fed: somme("fed"), rrq: somme("rrq"), rqap: somme("rqap"), ae: somme("ae"), af: pf.allocationFamille, fournitures: pf.fournitures, ace: pf.ace, prime: pr.total };
  for (const k of Object.keys(v.officiel)) {
    const e = Math.abs(Math.round(nous[k]) - v.officiel[k]);
    maxEcart = Math.max(maxEcart, e);
    // Écart connu : 40 $ d'impôt fédéral pour un couple 80 000 $ + 40 000 $ ; ailleurs, 1 $ au plus.
    verifier(`officiel ${v.salaires.join("+")} ${k}`, e <= (k === "fed" ? 40 : 1), `écart ${e} $`);
  }
}

/* 2. Hypothèque à taux fixe : intérêt composé deux fois par année. */
const hyp = { type: "hypotheque" };
verifier("taux mensuel 5 % semestriel", proche(C.tauxMensuel(hyp, 5), Math.pow(1.025, 1 / 6) - 1, 1e-12));
verifier("taux mensuel marge 6 %", proche(C.tauxMensuel({ type: "marge" }, 6), 0.005, 1e-12));
// Paiement de 300 000 $ sur 25 ans à 5 % : 1 744,81 $ par mois (calculatrices canadiennes).
const i5 = C.tauxMensuel(hyp, 5);
verifier("paiement 300 k$ 25 ans 5 %", proche(C.paiementPour(300000, i5, 300), 1744.81, 0.05), C.paiementPour(300000, i5, 300).toFixed(2));
verifier("mois restants, réciproque", proche(C.moisRestants(300000, i5, C.paiementPour(300000, i5, 300)), 300, 1e-6));
verifier("paiement trop petit : jamais", C.moisRestants(100000, 0.005, 400) === Infinity);

/* 3. Simulation des dettes : ce qui est payé = soldes + intérêts. */
const dettes = [
  { id: "a", nom: "Marge", type: "marge", solde: 50000, taux: 6, paiement: 0, frequence: "mois", interetsSeulement: true, limite: 60000, partMoi: 100, paiementMoi: 100 },
  { id: "b", nom: "Hypothèque", type: "hypotheque", solde: 200000, taux: 4, paiement: 1200, frequence: "mois", interetsSeulement: false, finTerme: "2028-06-01", tauxRenouvellement: 4.5, dureeTerme: 5, privilege: 15, partMoi: 100, paiementMoi: 100 },
  { id: "c", nom: "Prêt", type: "pret", solde: 15000, taux: 5, paiement: 300, frequence: "mois", interetsSeulement: false, creditImpot: 34, partMoi: 100, paiementMoi: 100 },
];
for (const methode of ["avalanche", "hybride", "boule"]) {
  const s = C.simulerDettes(dettes, { debut: "2026-11", methode, extraMensuel: 1500, moisMax: 600 });
  verifier(`${methode} : remboursé`, !!s.libre);
  verifier(`${methode} : soldes jamais négatifs`, s.mois.every(m => m.soldes.every(x => x >= 0)));
  verifier(`${methode} : intérêts nets ≤ intérêts`, s.interetsNetsTotaux <= s.interetsTotaux + 1e-6);
}
const av = C.simulerDettes(dettes, { debut: "2026-11", methode: "avalanche", extraMensuel: 1500, moisMax: 600 });
const min = C.simulerDettes(dettes, { debut: "2026-11", methode: "minimum", moisMax: 600 });
verifier("payer plus coûte moins d'intérêts", av.interetsTotaux < min.interetsTotaux);
verifier("minimums : la marge en intérêts seulement n'est jamais remboursée", !min.libre);
// Au renouvellement, le paiement est recalculé au nouveau taux sur l'amortissement restant.
const r = C.simulerDettes([dettes[1]], { debut: "2026-11", methode: "minimum", moisMax: 600 }).dettes[0].premierRenouvellement;
verifier("renouvellement enregistré", r && r.taux === 4.5 && r.date.getFullYear() === 2028);

/* 4. Projection : l'hypothèque payée devient de l'équité ; la maison prend de la valeur. */
const sim = C.simulerDettes([dettes[1]], { debut: "2026-11", methode: "avalanche", extraMensuel: 0, continuerApres: 240, moisMax: 480 });
const p = C.projeterValeurNette({ annees: 20, anneeDepart: 2026, rendement: 5, reer: { solde: 0, cotisationAnnuelle: 0 }, celi: { solde: 0, cotisationAnnuelle: 0 },
  maison: { valeur: 500000, part: 100, croissance: 3 }, voitures: [{ valeur: 20000, depreciation: 15 }], dettes: [dettes[1]] }, sim);
verifier("valeur nette de départ", proche(p[0].moi, 500000 + 20000 - 200000, 0.01));
verifier("équité croissante", p.every((x, i) => i === 0 || x.equiteMoi > p[i - 1].equiteMoi));
verifier("maison +3 %/an", proche(p[10].valeurMaison, 500000 * Math.pow(1.03, 10), 0.01));
verifier("auto −15 %/an", proche(p[2].voitureMoi, 20000 * 0.85 * 0.85, 0.01));

/* 5. REEE : 30 % de subventions, plafonds annuels et à vie. */
const reee = C.projeterReee({ enfants: [{ age: 0, solde: 0 }], cotisationAnnuelle: 2500 }, 0);
verifier("REEE : subventions 500 $ + 250 $ par an, plafonnées à vie", proche(reee[0].subventions, 7200 + 3600, 0.01), reee[0].subventions);

/* 6. Pratique incorporée : tout l'argent est compté (impôts, dépenses, dividendes, société). */
for (const retrait of ["tout", "fixe"]) {
  const s = C.impotSociete({ revenu: 200000, depensesPro: 3000, fraisSociete: 4000, tauxSociete: 0.205, retrait, retraitFixe: 100000 });
  const somme = s.societe.impotSociete + s.total + s.net + s.societe.depenses + s.societe.frais + s.societe.retenu;
  verifier(`société ${retrait} : rien ne se perd`, proche(somme, 200000, 0.01), somme.toFixed(2));
  verifier(`société ${retrait} : dividendes`, retrait === "tout" ? proche(s.societe.retenu, 0, 0.01) : proche(s.dividendes, 100000, 0.01));
  verifier(`société ${retrait} : pas de RRQ sur les dividendes`, s.rrq === 0 && s.rqap === 0);
}
// Intégration imparfaite des dividendes non déterminés : tout verser coûte un peu plus que sans société.
const sTout = C.impotSociete({ revenu: 200000, depensesPro: 3000, fraisSociete: 0, tauxSociete: 0.205, retrait: "tout" });
const sansSoc = C.impotParticulier({ revenu: 200000, depensesPro: 3000 });
verifier("société, tout versé : impôt total proche du particulier (± 10 %)", Math.abs(sTout.totalGlobal - sansSoc.total) < 0.1 * sansSoc.total, `${Math.round(sTout.totalGlobal)} contre ${Math.round(sansSoc.total)}`);

/* 7. À l'acte : visites à 100 %, celles des apprenants comprises, sans forfait horaire. Les montants
   de la RAMQ absents viennent de la Brochure no 1 (colonne établissement, liste 1). */
const rev = { annee: "type", demiJournees: 9, enseignement: 3, heuresParDJ: 4, semaines: 46, patientsParDJ: 5, residents: 1, patientsPendantSupervision: 0, autresRevenus: 0,
  inscritsDebut: 500, nouveauxGuichet: 0, nouveauxSansMedecin: 0, nouveauxTransferes: 0, semainesArrivee: 46, partVulnerable: 20,
  mix: { suivi: 70, suiviV: 15, perioV: 5, pedia: 5, gross: 5 } };
const g = C.revenuGmfu(rev), g0 = C.revenuGmfu({ ...rev, residents: 0 });
const tv1 = C.tarifVisite(rev.mix, 1, C.TARIFS_LIEU.etablissement);
verifier("à l'acte : visites = mixte × 100 / 63,58 (sans apprenants)", proche(g0.acte.visites, g0.mixte.visites * 100 / 63.58, 0.01));
verifier("à l'acte : visites des apprenants facturées, pas d'intervention de supervision", proche(g.acte.visites - g0.acte.visites, 46 * 3 * 4.5 * tv1, 0.01) && g.acte.supervision === undefined);
verifier("à l'acte : pas de forfait horaire", g.acte.forfaitHoraire === undefined && g.acte.heures === undefined);
const g10 = C.revenuGmfu({ ...rev, residents: 0, patientsParDJ: g0.seuilActe });
verifier("à l'acte : au seuil, la clinique paie comme l'horaire", proche(g10.acte.visites, 6 * 46 * 99.48 * 4, 1), `${Math.round(g10.acte.visites)}`);

/* 8. Frais de cabinet : pourcentage de la facturation et montant fixe, à l'acte seulement par défaut. */
const gf = C.revenuGmfu({ ...rev, fraisCabinetPct: 30, fraisCabinetMois: 500, compensationCabinet: 1000 });
verifier("frais : à l'acte = 30 % + 6 000 $ − 1 000 $", proche(gf.acte.fraisCabinet, gf.acte.total * 0.30 + 6000 - 1000, 0.01));
verifier("frais : rien au taux horaire ni au mixte par défaut", gf.horaire.fraisCabinet === 0 && gf.mixte.fraisCabinet === 0);
const gt = C.revenuGmfu({ ...rev, fraisCabinetPct: 30, fraisCabinetTousModes: true });
verifier("frais : tous les modes si demandé", gt.horaire.fraisCabinet > 0 && gt.mixte.fraisCabinet > 0);
verifier("frais : le seuil de l'acte monte avec le pourcentage", gf.seuilActe > g.seuilActe);

/* 9. SRV et activités en établissement. */
const gs = C.revenuGmfu({ ...rev, demiJourneesSRV: 1, patientsSRV: 12 });
verifier("SRV : 12 visites de plus par semaine", gs.nbVisites - g.nbVisites === 12 * 46 && gs.acte.visites > g.acte.visites);
verifier("SRV : heures au taux horaire comprises", proche(gs.heures - g.heures, 46 * 4, 1e-9));
const hosp = { calcul: "patients", patients: 16, parPatient: 60, nombre: 7, frequence: "cycle", cycle: 6 };
verifier("activité : 7 jours toutes les 6 semaines = 60,7 jours", proche(C.joursActivite(hosp, 46), 7 * 52 / 6, 1e-9));
verifier("activité : 16 patients × 60 $ = 960 $ par jour", C.revenuActivite(hosp, 46).parJour === 960);
verifier("activité : fréquences semaine, mois, année", C.joursActivite({ nombre: 2, frequence: "semaine" }, 46) === 92 && C.joursActivite({ nombre: 4, frequence: "mois" }, 46) === 48 && C.joursActivite({ nombre: 10, frequence: "annee" }, 46) === 10);
const ga = C.revenuGmfu({ ...rev, fraisCabinetPct: 30, activites: [hosp] });
const totalHosp = 7 * 52 / 6 * 960;
verifier("activité : ajoutée à chaque mode", ["horaire", "mixte", "acte"].every(m => proche(ga[m].total - g[m].total, totalHosp, 0.01)));
verifier("activité : sans frais de cabinet", proche(ga.acte.fraisCabinet, (ga.acte.total - totalHosp) * 0.30, 0.01));

/* 10. Tarifs modifiables, très vulnérables, apprenants, sans rendez-vous, majoration. */
const g2 = C.revenuGmfu({ ...rev, tarifs: { suivi: [42.25, 46.95] } });
verifier("tarifs : un tarif modifié change les visites", g2.acte.visites > g.acte.visites && g2.horaire.total === g.horaire.total);
const gtv = C.revenuGmfu({ ...rev, partVulnerable: 10, partTresVulnerable: 10, forfaitTresVulnerable: 155 });
verifier("très vulnérables : forfait annuel propre", proche(gtv.acte.forfaitVulnerable - C.revenuGmfu({ ...rev, partVulnerable: 20 }).acte.forfaitVulnerable, 500 * 0.10 * (155 - 47), 0.01));
const gsup = C.revenuGmfu({ ...rev, supervisionFacturation: "visites", residents: 1, externes: 1 });
verifier("apprenants : 4,5 + 2,5 visites par demi-journée d'enseignement", proche(gsup.visitesApprenants, 46 * 3 * 7, 1e-9) && gsup.mixte.supervision === 0 && gsup.mixte.visites > g.mixte.visites);
verifier("apprenants : au mixte, intervention de supervision par défaut", proche(g.mixte.visites, g0.mixte.visites, 1e-6) && proche(g.mixte.supervision, 46 * 3 * 3.5 * 99.48 * 0.6215, 0.01));
const gsrv = C.revenuGmfu({ ...rev, demiJourneesSRV: 1, patientsSRV: 12, pctSrvComplexe: 50 });
verifier("SRV : patient payé moins qu'une visite de rendez-vous", gsrv.tarifMoyenSrv < gsrv.tarifMoyenRdv && gsrv.tarifMoyenSrv > 0);
verifier("SRV : visites ponctuelles à l'acte, sans supplément", proche(gsrv.acte.total - C.revenuGmfu({ ...rev, demiJourneesSRV: 1, patientsSRV: 0 }).acte.total, 46 * 12 * (0.5 * 17.70 + 0.5 * 35.40), 0.5) && gsrv.acte.supplementsSRV === undefined);
const gmaj = C.revenuGmfu({ ...rev, majorationPct: 15 }), gpe = { ...rev, annee: "premiere", inscritsDebut: 0, nouveauxGuichet: 100, partVulnerable: 20, partTresVulnerable: 10 };
verifier("majoration : +15 % sur les heures et les forfaits", proche(gmaj.horaire.heures, g.horaire.heures * 1.15, 0.01) && proche(gmaj.horaire.forfaitInscription, g.horaire.forfaitInscription * 1.15, 1e-6)
  && proche(gmaj.horaire.forfaitVulnerable, g.horaire.forfaitVulnerable * 1.15, 1e-6));
verifier("majoration : pas sur les suppléments", proche(C.revenuGmfu({ ...gpe, majorationPct: 15 }).horaire.supplements, C.revenuGmfu(gpe).horaire.supplements, 1e-9));

/* 11. Revenus non professionnels : imposables, sans RRQ ni RQAP. */
const pBase = C.impotParticulier({ revenu: 200000, depensesPro: 3000 }), pAutres = C.impotParticulier({ revenu: 200000, depensesPro: 3000, autresImposables: 10000 });
verifier("autres revenus : même RRQ, plus d'impôt, net plus élevé", pAutres.rrq === pBase.rrq && pAutres.fed + pAutres.qc > pBase.fed + pBase.qc && pAutres.net > pBase.net && pAutres.net - pBase.net < 10000);

/* 12. Patrimoine : autres actifs et objectifs d'épargne dans la projection. */
const baseVN = { annees: 5, anneeDepart: 2026, rendement: 5, reer: { solde: 0, cotisationAnnuelle: 0 }, celi: { solde: 0, cotisationAnnuelle: 0 },
  maison: { valeur: 0, part: 0, croissance: 0 }, voitures: [], dettes: [dettes[1]] };
const pA = C.projeterValeurNette({ ...baseVN, autresActifs: [{ valeur: 100000, croissance: 3, part: 50, partMenage: 100 }] }, sim);
const p0 = C.projeterValeurNette(baseVN, sim);
verifier("autres actifs : votre part, +3 %/an", proche(pA[4].moi - p0[4].moi, 50000 * Math.pow(1.03, 4), 0.01) && proche(pA[4].menage - p0[4].menage, 100000 * Math.pow(1.03, 4), 0.01));
const pG = C.projeterValeurNette({ ...baseVN, objectifs: [{ solde: 500, mensuel: 100, mois: 18, depenser: false }, { solde: 0, mensuel: 200, mois: 12, depenser: true }] }, sim);
verifier("objectifs : versements jusqu'à la date, puis dépensé ou gardé", proche(pG[1].objectifs, 500 + 1200, 1e-9) && proche(pG[2].objectifs, 500 + 1800, 1e-9) && proche(pG[2].moi - p0[2].moi, 2300, 0.01));

const pR = C.projeterValeurNette({ ...baseVN, reer: { solde: 10000, cotisationAnnuelle: 0 }, rendements: [10, -10, 5, 5, 5] }, sim);
const pC = C.projeterValeurNette({ ...baseVN, reer: { solde: 10000, cotisationAnnuelle: 0 } }, sim);
verifier("rendements variables : +10 % puis −10 %", proche(pR[1].reer, 11000, 1e-6) && proche(pR[2].reer, 9900, 1e-6) && proche(pC[1].reer, 10500, 1e-6));

/* 13. Tarifs de la RAMQ : en cabinet et en établissement (onglet B). */
const TL = C.TARIFS_LIEU;
verifier("tarifs : suivi 15803-15804, cabinet et établissement", String(TL.cabinet.suivi) === "42.85,49.15" && String(TL.etablissement.suivi) === "32.25,36.95");
verifier("tarifs : visites ponctuelles du sans rendez-vous", String(TL.etablissement.srvMineure) === "15.3,17.7" && String(TL.cabinet.srvComplexe) === "40.8,47.05");
const gCab = C.revenuGmfu({ ...rev, demiJourneesSRV: 1, patientsSRV: 12, tarifs: TL.cabinet }), gEtab = C.revenuGmfu({ ...rev, demiJourneesSRV: 1, patientsSRV: 12, tarifs: TL.etablissement });
verifier("tarifs : le cabinet paie plus la visite que l'établissement", gCab.acte.visites > gEtab.acte.visites * 1.3 && gCab.tarifMoyenSrv > gEtab.tarifMoyenSrv);

/* 14. Brochure no 1 : taux horaire, montants du lieu, volume de patients, pratique polyvalente. */
verifier("taux horaire : 1 540 h à 100 %, puis 71,8 %", g.heures === 1656 && g.heuresAuDela === 116 && proche(g.horaire.heures, (1540 + 116 * 0.718) * 99.48, 0.01));
verifier("taux horaire : dépassement autorisé (2 420 h)", proche(C.revenuGmfu({ ...rev, heuresMax100: 2420 }).horaire.heures, 1656 * 99.48, 0.01));
verifier("lieu : établissement par défaut (forfait 8,95 $, demi-per diem 41,45 $)", proche(g.horaire.forfaitInscription, 500 * 8.95, 1e-6) && proche(g.horaire.perDiem, 46 * 3 * 41.45, 1e-6));
const gCab2 = C.revenuGmfu({ ...rev, lieuTarifs: "cabinet", listeEnseignement: "2", externes: 1 });
verifier("lieu : cabinet, liste 2 (86,95 $ et 98 $ par demi-journée)", proche(gCab2.horaire.perDiem, 46 * 3 * (86.95 + 98), 1e-6) && proche(gCab2.horaire.forfaitInscription, 500 * 11.85, 1e-6));
verifier("lieu : la clinique prend la colonne cabinet", C.lieuTarifs({ milieu: "clinique", lieuTarifs: "auto" }) === "cabinet" && C.lieuTarifs({ milieu: "gmfu" }) === "etablissement" && C.lieuTarifs({ milieu: "clinique", lieuTarifs: "etablissement" }) === "etablissement");
verifier("suppléments 19957 à 19960 en établissement", proche(C.revenuGmfu(gpe).horaire.supplements, 100 * (0.7 * 19.55 + 0.2 * 128.90 + 0.1 * 257.80), 1e-6));
const gv = C.revenuGmfu({ ...rev, inscritsDebut: 1000, partVulnerable: 30 });
verifier("volume : 15 000 $ à 1 000 inscrits, plus les suppléments au-delà de 500 et de 200 vulnérables", proche(gv.horaire.volume, 15000 + 250 * 5.23 + 250 * 10.46 + 100 * 5.23, 1e-6));
verifier("volume : sans assiduité de 80 %, le montant seulement", proche(C.revenuGmfu({ ...rev, inscritsDebut: 1000, partVulnerable: 30, assiduite80: false }).horaire.volume, 15000, 1e-9));
verifier("volume : 7 500 $ de 750 à 999, rien sous 750", C.montantsVolume(800, 0).montant === 7500 && C.montantsVolume(999, 0).montant === 7500 && C.montantsVolume(749, 0).montant === 0 && g.horaire.volume === 0);
const hospT = { ...hosp, type: "hospitalisation" };
verifier("polyvalence : 5 % des activités à 1 000 inscrits", proche(C.revenuGmfu({ ...rev, inscritsDebut: 1000, activites: [hospT] }).horaire.polyvalence, totalHosp * 0.05, 0.01));
verifier("polyvalence : première année, 10 % dès 300 inscrits", C.revenuGmfu({ ...rev, annee: "premiere", inscritsDebut: 0, nouveauxGuichet: 300, activites: [hospT] }).pctPolyvalence === 10);
verifier("polyvalence : seuils de la 3e année", C.tauxPolyvalence(650, 0, 3) === 5 && C.tauxPolyvalence(399, 0, 3) === 0 && C.tauxPolyvalence(650, 0, 5) === 0);
verifier("polyvalence : pas sur la garde ni sur une autre activité", C.revenuGmfu({ ...rev, inscritsDebut: 1000, activites: [{ ...hosp, type: "garde" }, { ...hosp, type: "autre" }] }).horaire.polyvalence === 0);
verifier("forfait GMF : 9,35 $ par inscrit vu (80 % par défaut)", proche(C.revenuGmfu({ ...rev, membreGmf: true }).horaire.forfaitGmf, 500 * 0.8 * 9.35, 1e-6) && g.horaire.forfaitGmf === 0 && proche(g.forfaitGmfPossible, 500 * 0.8 * 9.35, 1e-6));
verifier("forfait GMF : chaque nouveau patient compte", proche(C.revenuGmfu({ ...gpe, membreGmf: true, pctPatientsVus: 50 }).horaire.forfaitGmf, 100 * 9.35, 1e-6));
verifier("taux horaire : perte au-delà du plafond", proche(g.perteHeures, 116 * 0.282 * 99.48, 0.01) && g.gainPalier > 0.1);
verifier("polyvalence : au-delà de 245 vulnérables, chacun compte 2,5 fois", C.tauxPolyvalence(800, 345, 5) === 2.5 && C.tauxPolyvalence(800, 445, 5) === 5);

console.log(`${reussis} vérifications réussies, ${echecs} échec(s). Écart maximal avec l'outil officiel : ${maxEcart} $.`);
process.exit(echecs ? 1 : 0);
