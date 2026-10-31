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
const catalogues = fs.readFileSync(path.join(__dirname, "../js/catalogues.js"), "utf8");
const VERIFICATION = JSON.parse(catalogues.match(/const VERIFICATION = (\[.*?\]);\n/s)[1]);
let maxEcart = 0;
// Prime : l'outil de mai 2026 plafonnait à 766 $ par adulte. Du 1er juillet 2026 au 30 juin 2027,
// la RAMQ publie 789 $ (tarifs en vigueur, consultés le 31 octobre 2026). On compare à ce plafond,
// sans réécrire les montants conservés de l'outil.
const primeAttendue = off => off === 766 ? 789 : off === 1532 ? 1578 : off;
for (const v of VERIFICATION) {
  let a = C.impotSalarie({ salaire: v.salaires[0] }), b = v.couple ? C.impotSalarie({ salaire: v.salaires[1] }) : null;
  if (v.couple) [a, b] = C.transfertsConjoints(a, b);
  const somme = k => a[k] + (b ? b[k] : 0);
  const pf = C.prestationsFamille({ revenuNetFed: somme("revenuNetFed"), revenuNetQc: somme("revenuNetQc"), ages: v.ages, couple: v.couple });
  const pr = C.primeMedicaments({ revenuNetQc: somme("revenuNetQc"), couple: v.couple, ages: v.ages, adultesCouverts: v.couple ? 2 : 1 });
  const nous = { qc: somme("qc"), fed: somme("fed"), rrq: somme("rrq"), rqap: somme("rqap"), ae: somme("ae"), af: pf.allocationFamille, fournitures: pf.fournitures, ace: pf.ace, prime: pr.total };
  for (const k of Object.keys(v.officiel)) {
    const attendu = k === "prime" ? primeAttendue(v.officiel[k]) : v.officiel[k];
    const e = Math.abs(Math.round(nous[k]) - attendu);
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
verifier("REEE : 2 500 $ par an restent sous le plafond de 50 000 $", reee[0].cotisations === 42500, reee[0].cotisations);
// 5 000 $ par an pendant 17 ans dépasseraient 50 000 $. Le plafond coupe à 10 ans : les subventions
// annuelles (500 $ + 250 $) ne vont donc pas jusqu'aux plafonds à vie de 7 200 $ et 3 600 $.
const reeePlafond = C.projeterReee({ enfants: [{ age: 0, solde: 0 }], cotisationAnnuelle: 5000 }, 0.05);
verifier("REEE : cotisations coupées à 50 000 $, pas 85 000 $", reeePlafond[0].cotisations === 50000 && proche(reeePlafond[0].subventions, 7500, 0.01), reeePlafond[0]);
const reeeDeja = C.projeterReee({ enfants: [{ age: 0, solde: 1000, cotisations: 48000 }], cotisationAnnuelle: 5000 }, 0);
verifier("REEE : les cotisations déjà versées réduisent le plafond", reeeDeja[0].cotisations === 2000, reeeDeja[0].cotisations);

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
const gf = C.revenuGmfu({ ...rev, fraisCabinetPct: 30, fraisCabinetMois: 500, compensationMode: "manuel", compensationCabinet: 1000 });
verifier("frais : à l'acte = 30 % (hors compensation) + 6 000 $", proche(gf.acte.fraisCabinet, (gf.acte.total - 1000) * 0.30 + 6000, 0.01) && gf.acte.compensation === 1000);
verifier("frais : rien au taux horaire ni au mixte par défaut", gf.horaire.fraisCabinet === 0 && gf.mixte.fraisCabinet === 0);
const gt = C.revenuGmfu({ ...rev, fraisCabinetPct: 30, fraisCabinetTousModes: true });
verifier("frais : tous les modes si demandé", gt.horaire.fraisCabinet > 0 && gt.mixte.fraisCabinet > 0);
verifier("frais : le seuil de l'acte monte avec le pourcentage", gf.seuilActe > g.seuilActe);

/* 7b. Seuils d'une demi-journée : mixte contre horaire (forfait de responsabilité compris), acte contre mixte. */
const revSeul = { ...rev, residents: 0, externes: 0, enseignement: 0, fraisCabinetPct: 0, fraisCabinetMois: 0, fraisCabinetTousModes: false,
  mix: { suivi: 100, suiviV: 0, perioV: 0, pedia: 0, gross: 0 }, heuresParDJ: 4, inscritsDebut: 600, annee: "type", patientsParDJ: 5, semaines: 46, demiJournees: 9 };
const gSeul = C.revenuGmfu(revSeul);
const tvS = 36.95, pctS = 0.6358, HS = 4, thS = 99.48, fhS = 59.68, parS = tvS * pctS;
verifier("seuil mixte : sans forfait de responsabilité, même chiffre que l'heure contre les visites",
  proche(gSeul.seuilMixte, (thS - fhS) * HS / parS, 1e-6) && proche(gSeul.seuilMixte, gSeul.seuilPatients, 1e-9), gSeul.seuilMixte);
verifier("seuil acte-mixte : le forfait horaire du mixte, divisé par l'écart d'une visite",
  proche(gSeul.seuilActeMixte, HS * fhS / (tvS - parS), 1e-6), gSeul.seuilActeMixte);
const auDessus = C.revenuGmfu({ ...revSeul, patientsParDJ: Math.floor(gSeul.seuilMixte + 1e-9) + 1 });
const enDessous = C.revenuGmfu({ ...revSeul, patientsParDJ: Math.floor(gSeul.seuilMixte + 1e-9) });
verifier("seuil mixte : dès l'entier au-dessus, le mixte mène ; en dessous, l'horaire",
  auDessus.demiJourneeClinique.mixte > auDessus.demiJourneeClinique.horaire
  && enDessous.demiJourneeClinique.horaire >= enDessous.demiJourneeClinique.mixte - 0.02, { auDessus: auDessus.demiJourneeClinique, enDessous: enDessous.demiJourneeClinique });
const acteDessus = C.revenuGmfu({ ...revSeul, patientsParDJ: Math.floor(gSeul.seuilActeMixte + 1e-9) + 1 });
verifier("seuil acte-mixte : dès l'entier au-dessus, l'acte mène", acteDessus.demiJourneeClinique.acte > acteDessus.demiJourneeClinique.mixte, acteDessus.demiJourneeClinique);
const gvS = C.revenuGmfu({ ...revSeul, mix: { suivi: 0, suiviV: 100, perioV: 0, pedia: 0, gross: 0 } });
const parVuln = 45.20 * pctS, respS = 8.25;
verifier("seuil mixte : le forfait de responsabilité (8,25 $) repousse le seuil",
  proche(gvS.seuilMixte, (thS - fhS) * HS / (parVuln - respS), 1e-6) && gvS.seuilMixte > gvS.seuilPatients, gvS.seuilMixte);
const gfS = C.revenuGmfu({ ...revSeul, fraisCabinetPct: 30 });
verifier("seuil acte-mixte : 30 % remis à la clinique ne change pas le seuil de la RAMQ",
  proche(gfS.seuilActeMixte, gSeul.seuilActeMixte, 1e-9) && gfS.seuilActeMixte < 20, gfS.seuilActeMixte);
verifier("seuil après frais : 30 % à l'acte laisse un écart d'environ 2 $ par visite, pas un seuil de demi-journée",
  proche(gfS.seuilActeMixteApresFrais, HS * fhS / (tvS * 0.7 - parS), 1e-6) && gfS.seuilActeMixteApresFrais > 20, gfS.seuilActeMixteApresFrais);
const fixeS = 500 * 12 / (46 * 9);
const gmS = C.revenuGmfu({ ...revSeul, fraisCabinetMois: 500 });
verifier("seuil après frais : 500 $ par mois s'étalent sur les demi-journées, sans changer le seuil de la RAMQ",
  proche(gmS.seuilActeMixte, gSeul.seuilActeMixte, 1e-9)
  && proche(gmS.seuilActeMixteApresFrais, (HS * fhS + fixeS) / (tvS - parS), 1e-6), gmS.seuilActeMixteApresFrais);
verifier("seuil : les frais exigés dans les trois modes ne déplacent pas le mixte ni l'acte",
  proche(C.revenuGmfu({ ...revSeul, fraisCabinetPct: 30, fraisCabinetMois: 500, fraisCabinetTousModes: true }).seuilMixte, gSeul.seuilMixte, 1e-6)
  && proche(C.revenuGmfu({ ...revSeul, fraisCabinetPct: 30, fraisCabinetTousModes: true }).seuilActeMixte, gSeul.seuilActeMixte, 1e-6)
  && proche(C.revenuGmfu({ ...revSeul, fraisCabinetPct: 30, fraisCabinetTousModes: true }).seuilActeMixteApresFrais, gSeul.seuilActeMixte, 1e-4));

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
// Assiduité (EP 40, par. 15.05) : 100 % des suppléments à 80 %, 75 % de 75 à 79 %, 50 % de 70 à 74 % ; le forfait n'en dépend pas.
const vol80 = C.montantsVolume(1200, 400, "80"), vol75 = C.montantsVolume(1200, 400, "75"), vol70 = C.montantsVolume(1200, 400, "70"), vol0 = C.montantsVolume(1200, 400, "0");
verifier("assiduité : 8 629,50 $ à 80 %, 6 472,13 $ à 75 %, la moitié à 70 %, rien sous 70 % ; forfait de 15 000 $ dans tous les cas",
  proche(vol80.supplements, 8629.5, 1e-6) && proche(vol75.supplements, 6472.125, 1e-6) && proche(vol70.supplements, 4314.75, 1e-6) && vol0.supplements === 0
  && [vol80, vol75, vol70, vol0].every(v => v.montant === 15000), { vol75: vol75.supplements });
verifier("volume : inscriptions comptées en double pour le seul forfait (par. 4.16)", C.montantsVolume(500, 0).total === 0 && C.montantsVolume(500, 0, "80", 500).montant === 15000
  && C.montantsVolume(500, 0, "80", 250).montant === 7500 && C.montantsVolume(500, 0, "80", 500).supplements === 0);
verifier("volume : 7 500 $ de 750 à 999, rien sous 750", C.montantsVolume(800, 0).montant === 7500 && C.montantsVolume(999, 0).montant === 7500 && C.montantsVolume(749, 0).montant === 0 && g.horaire.volume === 0);
const hospT = { ...hosp, type: "hospitalisation" };
verifier("polyvalence : 5 % des activités à 1 000 inscrits", proche(C.revenuGmfu({ ...rev, inscritsDebut: 1000, activites: [hospT] }).horaire.polyvalence, totalHosp * 0.05, 0.01));
verifier("polyvalence : première année, 10 % dès 300 inscrits", C.revenuGmfu({ ...rev, annee: "premiere", inscritsDebut: 0, nouveauxGuichet: 300, activites: [hospT] }).pctPolyvalence === 10);
verifier("polyvalence : seuils de la 3e année", C.tauxPolyvalence(650, 0, 3) === 5 && C.tauxPolyvalence(399, 0, 3) === 0 && C.tauxPolyvalence(650, 0, 5) === 0);
verifier("polyvalence : aussi les centres de détention, jeunesse et de réadaptation (par. 16.01)",
  ["detention", "jeunesse", "readaptation"].every(t => C.revenuGmfu({ ...rev, inscritsDebut: 1000, activites: [{ ...hosp, type: t }] }).horaire.polyvalence > 0));
verifier("polyvalence : pas sur la garde ni sur une autre activité", C.revenuGmfu({ ...rev, inscritsDebut: 1000, activites: [{ ...hosp, type: "garde" }, { ...hosp, type: "autre" }] }).horaire.polyvalence === 0);
verifier("forfait GMF : 9,35 $ par inscrit vu (80 % par défaut)", proche(C.revenuGmfu({ ...rev, membreGmf: true }).horaire.forfaitGmf, 500 * 0.8 * 9.35, 1e-6) && g.horaire.forfaitGmf === 0 && proche(g.forfaitGmfPossible, 500 * 0.8 * 9.35, 1e-6));
verifier("forfait GMF : chaque nouveau patient compte", proche(C.revenuGmfu({ ...gpe, membreGmf: true, pctPatientsVus: 50 }).horaire.forfaitGmf, 100 * 9.35, 1e-6));
verifier("taux horaire : perte au-delà du plafond", proche(g.perteHeures, 116 * 0.282 * 99.48, 0.01) && g.gainPalier > 0.1);
const gc = C.revenuGmfu({ ...rev, lieuTarifs: "cabinet", enseignement: 0, demiJournees: 7, patientsParDJ: 6, demiJourneesSRV: 1, patientsSRV: 12 });
verifier("compensation : 3 jours à 64,80 $, une demi-journée et un sans rendez-vous à 32,40 $", proche(gc.detailCompensation.jour, 46 * (3 * 64.8 + 32.4 + 32.4), 1e-6));
verifier("compensation : DMÉ hors GMF dès 150 inscrits, licences seulement en GMF", proche(gc.detailCompensation.dme, 4 * (459.9 + 287.45), 1e-6)
  && proche(C.revenuGmfu({ ...rev, lieuTarifs: "cabinet", membreGmf: true }).detailCompensation.dme, 4 * 459.9, 1e-6) && C.compensationCabinet(rev, 46, 6, 149).dme === 0);
verifier("compensation : rien en établissement", g.detailCompensation.total === 0 && g.horaire.compensation === 0);
verifier("groupes : forfait à 150 % pour deux catégories, 200 % pour trois ou plus", proche(C.revenuGmfu({ ...rev, partGroupe2: 50, partGroupe34: 25 }).horaire.forfaitVulnerable,
  g.horaire.forfaitVulnerable * 1.5, 1e-6));
verifier("polyvalence : au-delà de 245 vulnérables, chacun compte 2,5 fois", C.tauxPolyvalence(800, 345, 5) === 2.5 && C.tauxPolyvalence(800, 445, 5) === 5);

/* 15. Au taux horaire, en établissement : forfait de responsabilité et suppléments (EP 40, par. 6.02 B, 8.01 et 7.02 B).
   À l'acte et au mixte, ils sont compris dans le tarif des visites. */
const ML = { e: C.montantsLieu("etablissement", 1), c: C.montantsLieu("cabinet", 1) };
verifier("responsabilité : 8,25 $, 13,35 $ et 8,95 $ en établissement ; 10,60 $, 17,05 $ et 11,40 $ en cabinet",
  ML.e.forfaitResponsabilite === 8.25 && ML.e.suppExamenEnfant === 13.35 && ML.e.suppSuiviGrossesse === 8.95
  && ML.c.forfaitResponsabilite === 10.6 && ML.c.suppExamenEnfant === 17.05 && ML.c.suppSuiviGrossesse === 11.4);
// 6 demi-journées cliniques × 5 patients × 46 semaines = 1 380 visites : 20 % de vulnérables, 5 % d'enfants, 5 % de grossesses.
verifier("responsabilité : par examen, selon la répartition des visites", proche(g.horaire.responsabilite, 1380 * (0.20 * 8.25 + 0.05 * 13.35 + 0.05 * 8.95) + 6.9 * 35.60, 1e-6)
  && proche(g.examens.vulnerables, 276, 1e-9) && proche(g.examens.enfants, 69, 1e-9) && proche(g.examens.grossesse, 69, 1e-9));
verifier("responsabilité : au taux horaire seulement, et comptée dans le total", g.mixte.responsabilite === undefined && g.acte.responsabilite === undefined
  && proche(g.horaire.total - g.horaire.heures - g.horaire.responsabilite, g.mixte.total - g.mixte.forfaitHoraire - g.mixte.visites - g.mixte.supervision, 1e-6));
const gPec = C.revenuGmfu({ ...rev, annee: "premiere", inscritsDebut: 0, nouveauxGuichet: 100 });
verifier("responsabilité : une prise en charge d'un patient vulnérable compte", gPec.nbPriseEnCharge > 0 && proche(gPec.examens.vulnerables, 1380 * 0.2, 1e-6));
verifier("responsabilité : majorée selon le territoire", proche(C.revenuGmfu({ ...rev, majorationPct: 15 }).horaire.responsabilite, g.horaire.responsabilite * 1.15, 1e-6));
verifier("DMÉ : la première année du permis, sans égard au nombre d'inscrits", proche(C.compensationCabinet({ ...rev, annee: "premiere" }, 46, 6, 20).dme, 4 * (459.9 + 287.45), 1e-6)
  && C.compensationCabinet(rev, 46, 6, 20).dme === 0);

/* 16. Fonds des services de santé (particuliers, 2026) : 1 % au-delà de 18 500 $ jusqu'à 150 $, puis au-delà de 64 355 $, au plus 1 000 $. */
const fssDe = rev => C.impotParticulier({ revenu: rev }).fss;
verifier("FSS 2026 : rien jusqu'à 18 500 $, 1 % ensuite", fssDe(18500) === 0 && proche(fssDe(25000), 65, 1e-9));
verifier("FSS 2026 : 150 $ de 33 500 $ à 64 355 $", proche(fssDe(40000), 150, 1e-9) && proche(fssDe(64355), 150, 1e-9));
verifier("FSS 2026 : 1 % au-delà de 64 355 $, au plus 1 000 $", proche(fssDe(100000), 150 + 356.45, 1e-6) && fssDe(149355) === 1000 && fssDe(300000) === 1000);

/* 17. Dividendes non déterminés : crédit québécois de 3,42 % en 2026, de 2,69 % dès 2027 (bulletin 2026-3). */
const soc26 = C.impotSociete({ revenu: 250000, depensesPro: 10000, fraisSociete: 4000, tauxSociete: 0.205, retrait: "tout" });
const soc27 = C.impotSociete({ revenu: 250000, depensesPro: 10000, fraisSociete: 4000, tauxSociete: 0.205, retrait: "tout", creditDividendesQc: 0.0269 });
verifier("dividendes : dès 2027, l'impôt du Québec monte de 0,73 % du dividende majoré", proche(soc27.qc - soc26.qc, soc26.societe.dividendes * 1.15 * (0.0342 - 0.0269), 0.01)
  && soc27.fed === soc26.fed);

/* 18. Rendement selon le profil (Normes d'hypothèses de projection 2026, avant frais) : revenu fixe 3,2 % ;
   actions canadiennes, américaines et internationales 6,3 %, 6,4 % et 6,6 % ; moins les frais de gestion. */
const eq = C.rendementProfil(60, 1);
verifier("rendement : équilibré (60 % d'actions), 5,14 % avant frais, 4,14 % après 1 % de frais", proche(eq.brut, 0.6 * 6.4333333 + 0.4 * 3.2, 1e-6) && proche(eq.net, eq.brut - 1, 1e-9));
verifier("rendement : 0 % d'actions = revenu fixe, 100 % = actions", proche(C.rendementProfil(0).brut, 3.2, 1e-9) && proche(C.rendementProfil(100).brut, (6.3 + 6.4 + 6.6) / 3, 1e-9));
verifier("rendement : part bornée de 0 à 100 %, frais non précisés = 0", C.rendementProfil(140).brut === C.rendementProfil(100).brut && C.rendementProfil(60).net === C.rendementProfil(60).brut);

/* 19. Frais de garde (2026). Québec : crédit remboursable de 78 % à 67 % selon le revenu familial, frais plafonnés
   à 12 525 $ (moins de 7 ans) et 6 305 $ (7 à 16 ans). Fédéral : déduction de 8 000 $ et 5 000 $ par enfant, au plus
   les 2/3 du revenu gagné ; au fédéral seulement. */
const garde1 = C.fraisGarde({ ages: [3], fraisQc: 15000, fraisFed: 15000, revenuFamilial: 200000, revenuGagne: 60000 });
verifier("garde : 67 % de 12 525 $ au-delà de 122 290 $ de revenu familial ; déduction de 8 000 $", proche(garde1.creditQc, 12525 * 0.67, 1e-6) && garde1.deduction === 8000, garde1);
const garde2 = C.fraisGarde({ ages: [3, 9], fraisQc: 30000, fraisFed: 30000, revenuFamilial: 30000, revenuGagne: 9000 });
verifier("garde : deux enfants, 75 % à 30 000 $, déduction aux 2/3 du revenu gagné", proche(garde2.creditQc, (12525 + 6305) * 0.75, 1e-6) && proche(garde2.deduction, 6000, 1e-9) && garde2.plafondFed === 13000, garde2);
const garde3 = C.fraisGarde({ ages: [17], fraisQc: 5000, fraisFed: 5000, revenuFamilial: 100000, revenuGagne: 50000 });
verifier("garde : rien après 16 ans", garde3.creditQc === 0 && garde3.deduction === 0, garde3);
verifier("garde : seuil de 122 290 $ à 70 %, au-delà à 67 %", C.fraisGarde({ ages: [2], fraisQc: 1000, revenuFamilial: 122290 }).taux === 0.70 && C.fraisGarde({ ages: [2], fraisQc: 1000, revenuFamilial: 122291 }).taux === 0.67);
const sansGarde = C.impotSalarie({ salaire: 60000 }), avecGarde = C.impotSalarie({ salaire: 60000, deductionGarde: 8000 });
verifier("garde : la déduction réduit l'impôt fédéral, pas celui du Québec", avecGarde.fed < sansGarde.fed && avecGarde.qc === sansGarde.qc && avecGarde.revenuNetFed === sansGarde.revenuNetFed - 8000 && avecGarde.revenuNetQc === sansGarde.revenuNetQc,
  { fed: [sansGarde.fed, avecGarde.fed], qc: [sansGarde.qc, avecGarde.qc] });
const autoSans = C.impotParticulier({ revenu: 200000, depensesPro: 5000 }), autoAvec = C.impotParticulier({ revenu: 200000, depensesPro: 5000, deductionGarde: 8000 });
verifier("garde : même règle pour un travailleur autonome", autoAvec.fed < autoSans.fed && autoAvec.qc === autoSans.qc && autoAvec.fss === autoSans.fss);

/* 20. Prise en charge d'une grossesse au premier trimestre (EP 40, par. 7.02 A) : 35,60 $ en établissement, 47,40 $ en
   cabinet, une fois par grossesse ; au taux horaire seulement. Sans nombre inscrit : suivis de grossesse ÷ 10. */
verifier("grossesse : 35,60 $ en établissement, 47,40 $ en cabinet", ML.e.suppGrossessePremierTrimestre === 35.6 && ML.c.suppGrossessePremierTrimestre === 47.4);
verifier("grossesse : estimée d'après les suivis (69 ÷ 10)", proche(g.examens.priseEnChargeGrossesse, 6.9, 1e-9));
const gGross = C.revenuGmfu({ ...rev, grossessesAn: 4 });
verifier("grossesse : nombre inscrit, 4 × 35,60 $ de plus que sans grossesse", proche(gGross.horaire.responsabilite - C.revenuGmfu({ ...rev, grossessesAn: 0 }).horaire.responsabilite, 4 * 35.6, 1e-6)
  && gGross.acte.total === g.acte.total && gGross.mixte.total === g.mixte.total);

/* 21. Taux horaire : les heures en clinique remplissent d'abord le plafond annuel ; la garde sur place faite en excédent
   est payée à 94 % plutôt qu'à 71,8 %, au plus 528 h (annexe XIV, par. 5.02, 5.03 et 5.05). Cas de l'audit B-01. */
const casGarde = (W, N, H, garde) => C.revenuGmfu({ ...rev, enseignement: 0, residents: 0, semaines: W, demiJournees: N, heuresParDJ: H, heuresMax100: 1540, heuresGardeSurPlace: garde });
const gA = casGarde(42, 8, 3.5, 600), gB = casGarde(40, 10, 4, 400), gC = casGarde(44, 10, 3.5, 600);
verifier("garde, cas A : 1 176 h en clinique + 600 h de garde : 236 h de garde à 94 %", gA.heures === 1176 && proche(gA.gardeAuDela, 236, 1e-9) && proche(gA.autresAuDela, 0, 1e-9)
  && proche(gA.perteHeures, 236 * 0.06 * 99.48, 1e-6), { garde: gA.gardeAuDela, perte: gA.perteHeures });
verifier("garde, cas B : 1 600 h + 400 h : 400 h à 94 %, 60 h à 71,8 % (perte 4 070,72 $)", proche(gB.gardeAuDela, 400, 1e-9) && proche(gB.autresAuDela, 60, 1e-9)
  && proche(gB.perteHeures, 4070.72, 0.01), gB.perteHeures);
verifier("garde, cas C : 1 540 h + 600 h : 528 h à 94 %, 72 h à 71,8 % (perte 5 171,37 $)", proche(gC.gardeAuDela, 528, 1e-9) && proche(gC.autresAuDela, 72, 1e-9)
  && proche(gC.perteHeures, 5171.37, 0.01), gC.perteHeures);
const sansGardeH = C.revenuGmfu({ ...rev, heuresMax100: 1540 }), hc = sansGardeH.heures;
const avecGardeH = C.revenuGmfu({ ...rev, heuresMax100: 1540, heuresGardeSurPlace: 600 });
verifier("garde : au plus 528 h à 94 %", C.revenuGmfu({ ...rev, heuresMax100: 1540, heuresGardeSurPlace: 5000 }).gardeAuDela === 528);
verifier("garde : sous le plafond, tout à 100 %", proche(C.revenuGmfu({ ...rev, heuresMax100: 5000, heuresGardeSurPlace: 200 }).horaire.heures, (hc + 200) * 99.48, 1e-6));
verifier("garde : le mixte et l'acte ne changent pas", avecGardeH.mixte.total === sansGardeH.mixte.total && avecGardeH.acte.total === sansGardeH.acte.total);

/* 22. Année type : de nouveaux patients par année remplacent les départs. Clientèle stable ; chacun donne son
   supplément d'inscription (19957 à 19960) et une visite de prise en charge. Rien de tel la première année. */
const anBase = C.revenuGmfu(rev), anNouv = C.revenuGmfu({ ...rev, nouveauxAnGuichet: 40, nouveauxAnSansMedecin: 10 });
const LM = C.montantsLieu(C.lieuTarifs(rev), 1);
const suppAttendus = 40 * (0.8 * LM.suppNonVulnerable + 0.2 * LM.suppVulnerableGuichet) + 10 * (0.8 * LM.suppNonVulnerable + 0.2 * LM.suppVulnerableHorsGuichet);
verifier("année type : suppléments des nouveaux patients", proche(anNouv.horaire.supplements - anBase.horaire.supplements, suppAttendus, 1e-6), { ecart: anNouv.horaire.supplements - anBase.horaire.supplements, suppAttendus });
verifier("année type : clientèle stable, 50 prises en charge", anNouv.inscritsFin === anBase.inscritsFin && proche(anNouv.nbPriseEnCharge - anBase.nbPriseEnCharge, 50, 1e-9));
verifier("année type : la prise en charge paie plus qu'un suivi, à l'acte", anNouv.acte.total > anBase.acte.total + suppAttendus);
const prem = { ...rev, annee: "premiere", inscritsDebut: 0, nouveauxGuichet: 300 };
verifier("première année : pas de nouveaux patients « par année »", C.revenuGmfu({ ...prem, nouveauxAnGuichet: 40 }).acte.total === C.revenuGmfu(prem).acte.total);

/* 23. Résidence : échelle salariale de l'entente FMRQ-MSSS 2021-2028 (annexe I), avec l'ajustement de 0,11 % du
   31 mars 2026 (avis de la RAMQ du 16 juillet 2026 : niveau 1, 58 793 $ puis 60 851 $ ; niveau 6, 89 229 $ puis
   92 352 $). Primes de responsabilité par période de 28 jours, 13 par année. */
const sr = (niveau, date, o = {}) => C.salaireResident({ niveau, date, ...o });
verifier("résidence : niveaux 1 et 6 de l'avis de la RAMQ", sr(1, "2026-10-01").salaire === 58793 && sr(6, "2026-10-01").salaire === 89229
  && sr(1, "2027-04-01").salaire === 60851 && sr(6, "2027-04-01").salaire === 92352);
verifier("résidence : échelle 2025-2026 de l'annexe I, jusqu'au 31 mars 2026", sr(1, "2026-03-31").salaire === 57296 && sr(6, "2026-03-31").salaire === 86957);
const E = C.FMRQ.echelles;
verifier("résidence : 0,11 % puis 2,5 % en 2026, 3,5 % en 2027, arrondis au dollar", E[0].salaires.every((x, i) => Math.round(Math.round(x * 1.0011) * 1.025) === E[1].salaires[i])
  && E[1].salaires.every((x, i) => Math.round(x * 1.035) === E[2].salaires[i]));
verifier("résidence : les niveaux 6 à 8 sont égaux ; l'échelle monte d'un niveau à l'autre", E.every(e => e.salaires[5] === e.salaires[6] && e.salaires[6] === e.salaires[7] && e.salaires.slice(0, 6).every((x, i, a) => !i || x > a[i - 1])));
verifier("résidence : prime de garde, 725 $ × 13 ; d'enseignement, 286 $ × 13", sr(2, "2026-10-01", { primeGarde: true }).garde === 9425 && sr(2, "2026-10-01", { primeEnseignement: true }).enseignement === 3718
  && sr(2, "2026-10-01", { primeGarde: true, primeEnseignement: true }).total === 64880 + 9425 + 3718);
verifier("résidence : après la fin de l'entente, la dernière échelle", sr(3, "2029-01-01").salaire === E[2].salaires[2]);
// Impôt d'une année mixte : il rejoint celui du particulier sans salaire, et celui du salarié sans entreprise.
const champsImpot = ["fed", "qc", "rrq", "rqap", "fss", "total", "net", "revenuNetFed", "revenuNetQc"];
verifier("impôt mixte = travailleur autonome, sans salaire", [20000, 90000, 250000].every(rv => {
  const a = C.impotMixte({ revenu: rv, depensesPro: 5000, reer: 3000, interetsEtudes: 400, autresImposables: 1000 }), b = C.impotParticulier({ revenu: rv, depensesPro: 5000, reer: 3000, interetsEtudes: 400, autresImposables: 1000 });
  return champsImpot.every(k => proche(a[k], b[k], 1e-6)); }));
verifier("impôt mixte = salarié, sans revenu d'entreprise", [30000, 64880, 150000].every(sal => {
  const a = C.impotMixte({ salaire: sal, syndicat: 500, reer: 2000, rpa: 1000 }), b = C.impotSalarie({ salaire: sal, syndicat: 500, reer: 2000, rpa: 1000 });
  return [...champsImpot, "ae"].every(k => proche(a[k], b[k], 1e-6)); }));
// Transition : 30 000 $ de salaire et 90 000 $ de revenu net d'entreprise. RRQ : part de l'employé sur le salaire, les deux
// parts sur le reste, sous le MGA (74 600 $) et le MGS (85 000 $) partagés.
const mix = C.impotMixte({ salaire: 30000, revenu: 100000, depensesPro: 10000 }), q = C.P2026.rrq;
const rrqMix = (30000 - q.exemption) * 0.063 + (q.mga - 30000) * (q.base + q.supp1) + (q.mgs - q.mga) * q.supp2;
verifier("transition : RRQ du salaire, puis des deux parts sous les maximums", proche(mix.rrq, rrqMix, 1e-6), { rrq: mix.rrq, rrqMix });
verifier("transition : assurance-emploi sur le salaire seulement ; FSS sur le revenu d'entreprise", proche(mix.ae, 30000 * C.P2026.ae.taux, 1e-9) && mix.fss > 0
  && C.impotMixte({ salaire: 120000 }).fss === 0);
const avecScol = C.impotMixte({ salaire: 70000, scolarite: 1100 }), sansScol = C.impotMixte({ salaire: 70000 });
verifier("résidence : droits de scolarité, crédit fédéral (taux de base, après l'abattement) et du Québec (8 %)",
  proche(sansScol.total - avecScol.total, 1100 * (0.14 * (1 - 0.165) + 0.08), 0.01), sansScol.total - avecScol.total);
verifier("résidence : la cotisation syndicale se déduit et sort de la paie", C.impotMixte({ salaire: 70000, syndicat: 600 }).total < sansScol.total
  && proche(sansScol.net - C.impotMixte({ salaire: 70000, syndicat: 600 }).net, 600 - (sansScol.total - C.impotMixte({ salaire: 70000, syndicat: 600 }).total), 1e-6));
const avecSynd = C.impotSalarie({ salaire: 70000, syndicat: 600 }), sansSynd = C.impotSalarie({ salaire: 70000 });
verifier("syndicat : crédit de 10 % au Québec, déduction fédérale, revenu net du Québec inchangé",
  proche(sansSynd.qc - avecSynd.qc, 60, 0.02) && avecSynd.fed < sansSynd.fed && proche(avecSynd.imposableQc, sansSynd.imposableQc, 1e-6)
  && avecSynd.imposable < sansSynd.imposable, { qc: sansSynd.qc - avecSynd.qc, fed: sansSynd.fed - avecSynd.fed });
const seul = C.impotSalarie({ salaire: 60000 }), charge = C.impotSalarie({ salaire: 60000, personneACharge: true });
verifier("personne à charge admissible : 16 452 $ × 14 % × (1 − 16,5 %) = 1 923,24 $", proche(seul.fed - charge.fed, 1923.24, 0.02), seul.fed - charge.fed);

/* 24. Paramètres 2027, provisoires : ceux de 2026 indexés selon la formule officielle (IPC de Statistique Canada,
   octobre à septembre) : fédéral 2,6 % (montants au dollar), Québec 3,15 % (paliers au multiple de 5 $). La même
   formule redonne les taux officiels de 2026 : 2,0 % et 2,05 %. Assurance-emploi 2027 : 70 800 $ et 1,29 % au Québec
   (Commission de l'assurance-emploi, taux de 2027, consulté le 31 octobre 2026). */
const P7 = C.P2027;
verifier("2027 : paliers fédéraux indexés de 2,6 %, au dollar", P7.federal.tranches.slice(0, 4).map(t => t[0]).join() === "60045,120088,186157,265203"
  && P7.federal.bpaMax === 16880 && P7.federal.bpaMin === 15215 && P7.montantEmploi === 1540, P7.federal.tranches.map(t => t[0]).join());
verifier("2027 : paliers du Québec indexés de 3,15 %, au multiple de 5 $", P7.quebec.tranches.slice(0, 3).map(t => t[0]).join() === "56055,112105,136410"
  && P7.quebec.montantBase === 19549, P7.quebec.tranches.map(t => t[0]).join());
verifier("2027 : assurance-emploi, crédit pour dividendes, taux inchangés ; 2026 intact", P7.ae.max === 70800 && P7.ae.taux === 0.0129 && P7.dividendes.creditQuebec === 0.0269
  && P7.federal.tranches[1][1] === 0.205 && C.P2026.federal.tranches[0][0] === 58523 && C.P2026.ae.max === 68900);
verifier("2027 : marqués provisoires ; 2026 avant, 2027 ensuite", P7.provisoire && !C.P2026.provisoire && C.parametres(2025) === C.P2026 && C.parametres(2026) === C.P2026
  && C.parametres(2027) === P7 && C.parametres(2031) === P7);
const impot26 = C.impotParticulier({ revenu: 200000, depensesPro: 20000 }).total;
C.utiliserAnnee(2027);
const impot27 = C.impotParticulier({ revenu: 200000, depensesPro: 20000 }).total, verif27 = C.avecAnnee(2026, () => C.parametresActifs().annee);
C.utiliserAnnee(2026);
verifier("2027 : à revenu égal, un peu moins d'impôt (paliers indexés) ; un calcul ponctuel en 2026 revient ensuite à 2027",
  impot27 < impot26 && impot26 - impot27 < 2000 && verif27 === 2026, { impot26, impot27 });

/* 27. Règles de la RAMQ de l'audit B : transfert (lettre d'entente no 304), compensation par jour civil, supervision,
   après-midi, DMÉ. */
const transf = typeTransfert => C.revenuGmfu({ ...rev, milieu: "clinique", lieuTarifs: "cabinet", ...C.montantsLieu("cabinet", 1), annee: "premiere", enseignement: 0, residents: 0,
  semaines: 12, semainesArrivee: 1, inscritsDebut: 0, nouveauxTransferes: 100, partVulnerable: 100, typeTransfert });
const tChang = transf("changement"), tBloc = transf("bloc");
verifier("transfert : changement de médecin, aucun supplément ; forfaits au prorata, le mois du transfert au premier médecin (11/12)",
  tChang.horaire.supplements === 0 && proche(tChang.horaire.forfaitInscription, 1185 * 11 / 12, 1e-6) && proche(tChang.horaire.forfaitVulnerable, 6250 * 11 / 12, 1e-6),
  { insc: tChang.horaire.forfaitInscription, vuln: tChang.horaire.forfaitVulnerable });
verifier("transfert en bloc (lettre d'entente no 304) : suppléments du guichet, 100 × 155,35 $", proche(tBloc.horaire.supplements, 15535, 1e-6)
  && proche(tBloc.horaire.forfaitInscription, tChang.horaire.forfaitInscription, 1e-9), tBloc.horaire.supplements);
const compSrv = memeJour => C.compensationCabinet({ patientsParDJ: 12, demiJourneesSRV: 1, patientsSRV: 20, srvMemeJour: memeJour, membreGmf: true, annee: "type" }, 38, 7, 0);
verifier("compensation : 64,80 $ au plus par jour civil ; le SRV le même jour partage le plafond (12 312 $ ou 9 849,60 $)",
  proche(compSrv(false).jour, 12312, 1e-6) && proche(compSrv(true).jour, 9849.6, 1e-6), { separe: compSrv(false).jour, meme: compSrv(true).jour });
const sup = (o = {}) => C.revenuGmfu({ ...rev, semaines: 40, demiJournees: 8, enseignement: 2, heuresParDJ: 4, residents: 1, inscritsDebut: 600, ...o });
verifier("supervision : les patients vus pendant le bloc ne se facturent pas avec l'intervention ; avec les visites des apprenants, oui",
  proche(sup({ patientsPendantSupervision: 3 }).mixte.visites, sup().mixte.visites, 1e-9)
  && sup({ patientsPendantSupervision: 3, supervisionFacturation: "visites" }).mixte.visites > sup({ supervisionFacturation: "visites" }).mixte.visites
  && sup({ patientsPendantSupervision: 3 }).acte.visites > sup().acte.visites);
verifier("supervision : 3,5 h l'avant-midi, jusqu'à 5 h l'après-midi (2 473,07 $ de plus pour 80 demi-journées de 4 h)",
  proche(sup().mixte.supervision, 40 * 2 * 3.5 * 99.48 * 0.6215, 1e-6) && proche(sup({ enseignementApresMidi: 2 }).mixte.supervision - sup().mixte.supervision, 2473.07, 0.01)
  && proche(sup({ enseignementApresMidi: 1 }).mixte.supervision, 40 * (3.5 + 4) * 99.48 * 0.6215, 1e-6));
const dme = o => C.compensationCabinet({ patientsParDJ: 0, membreGmf: false, annee: "type", ...o }, 40, 8, 600).dme;
verifier("DMÉ : hors GMF, licences et équipements ; le lien Internet et le commutateur (19977) seulement si réclamé", proche(dme({}), 4 * (459.90 + 287.45), 1e-6)
  && proche(dme({ dmeInternet: true }), 4 * (459.90 + 287.45 + 700.35), 1e-6) && proche(dme({ dmeInternet: true, membreGmf: true }), 4 * 459.90, 1e-6));

/* 28. Comparer les actes : chaque acte à l'acte, au mixte (63,58 %) et à l'heure selon sa durée ; supervision ou
   visites des apprenants (annexe XXIII) ; une demi-journée au taux horaire, au mixte et à l'acte ; CNESST à 100 %. */
const actes28 = C.valeurActes({ lieu: "etablissement", palier: 1 }), suivi28 = actes28.find(a => a.cle === "suivi"), suiviV28 = actes28.find(a => a.cle === "suiviV");
verifier("actes : un suivi, 36,95 $ à l'acte, 23,49 $ au mixte ; à l'heure (15 min) 147,80 $, 153,65 $ et 99,48 $",
  suivi28.tarif === 36.95 && suivi28.code === "15804" && proche(suivi28.mixte, 36.95 * 0.6358, 1e-9) && proche(suivi28.heure.acte, 147.8, 1e-9)
  && proche(suivi28.heure.mixte, 59.68 + 4 * 36.95 * 0.6358, 1e-9) && proche(suivi28.heure.horaire, 99.48, 1e-9) && proche(suiviV28.heure.horaire, 99.48 + 3 * 8.25, 1e-9), suivi28.heure);
verifier("actes : la durée choisie, le cabinet et le palier de moins de 500", proche(C.valeurActes({ lieu: "etablissement", palier: 1, durees: { suivi: 20 } })[0].heure.acte, 36.95 * 3, 1e-9)
  && C.valeurActes({ lieu: "cabinet", palier: 0 })[0].tarif === 42.85 && C.valeurActes({ lieu: "cabinet", palier: 0 })[0].code === "15803");
const sup28 = C.supervisionOuVisites({ heuresParDJ: 3.5, residents: 1, externes: 1, tarifMoyen: 36.95 });
verifier("supervision ou visites : 216,39 $ contre 164,45 $ (7 suivis) ; les visites l'emportent au-delà de 9,2 visites",
  proche(sup28.supervision, 3.5 * 99.48 * 0.6215, 1e-9) && proche(sup28.visites, 7 * 36.95 * 0.6358, 1e-9) && sup28.meilleur === "acte"
  && proche(sup28.seuil, 3.5 * 99.48 * 0.6215 / (36.95 * 0.6358), 1e-9) && proche(sup28.forfait, 3.5 * 59.68, 1e-9) && proche(sup28.perDiem, 41.45 + 49.85, 1e-9), sup28);
verifier("supervision ou visites : jusqu'à 5 h l'après-midi ; 12 visites l'emportent", C.supervisionOuVisites({ heuresParDJ: 4, apresMidi: true, tarifMoyen: 36.95 }).heures === 4
  && C.supervisionOuVisites({ heuresParDJ: 4, tarifMoyen: 36.95 }).heures === 3.5 && C.supervisionOuVisites({ heuresParDJ: 3.5, residents: 2, patientsParResident: 6, tarifMoyen: 36.95 }).meilleur === "visites");
const dj28 = C.demiJourneeActes({ lieu: "etablissement", palier: 1, heuresParDJ: 3.5, nombres: { suivi: 4, perioV: 2, pecVuln: 1, "09926": 1 } });
const tarifs28 = 4 * 36.95 + 2 * 84.80 + 82.90;
verifier("ma demi-journée : taux horaire, mixte et acte, avec une attestation de la CNESST à 100 % partout",
  proche(dj28.horaire.brut, 3.5 * 99.48 + 3 * 8.25 + 27.57, 1e-9) && proche(dj28.mixte.brut, 3.5 * 59.68 + tarifs28 * 0.6358 + 27.57, 1e-9)
  && proche(dj28.acte.brut, tarifs28 + 27.57, 1e-9) && dj28.patients === 7 && dj28.formulaires === 27.57, dj28);
const dj28f = C.demiJourneeActes({ lieu: "cabinet", palier: 1, heuresParDJ: 4, nombres: { suivi: 8 }, fraisCabinetPct: 30 });
verifier("ma demi-journée : les frais de cabinet à l'acte seulement, sauf si la clinique les exige partout", proche(dj28f.acte.net, 8 * 49.15 * 0.7, 1e-9)
  && dj28f.mixte.net === dj28f.mixte.brut && proche(C.demiJourneeActes({ lieu: "cabinet", heuresParDJ: 4, nombres: { suivi: 8 }, fraisCabinetPct: 30, fraisTousModes: true }).mixte.net,
    C.demiJourneeActes({ lieu: "cabinet", heuresParDJ: 4, nombres: { suivi: 8 } }).mixte.brut * 0.7, 1e-9));
verifier("CNESST : 15 formulaires, dont l'attestation (27,57 $) et le REM (520,81 $)", C.CNESST.length === 15 && C.CNESST[0].tarif === 27.57 && C.CNESST.find(f => f.code === "09944").tarif === 520.81);

/* 25. CELIAPP (ARC, « Cotiser à un CELIAPP », 31 octobre 2026) : droits de 8 000 $ par année, plus le report des droits
   inutilisés de l'année d'avant (au plus 8 000 $), et 40 000 $ à vie. Versements par mois dans la projection. */
verifier("CELIAPP : 20 000 $ voulus, 8 000 $ retenus chaque année jusqu'au plafond à vie",
  C.celiappParAn({ cotisationAnnuelle: 20000, cotisationsVersees: 0 }, 6).join() === "8000,8000,8000,8000,8000,0,0", C.celiappParAn({ cotisationAnnuelle: 20000 }, 6));
verifier("CELIAPP : report de 5 000 $ l'an 0 ; ensuite, ce qui reste des droits de l'année d'avant",
  C.celiappParAn({ cotisationAnnuelle: 20000, cotisationsVersees: 0, droitsReportes: 5000 }, 3).join() === "13000,8000,8000,8000"
  && C.celiappParAn({ cotisationAnnuelle: 20000, cotisationsVersees: 0, droitsReportes: 12000 }, 0).join() === "16000"
  && C.celiappParAn({ cotisationAnnuelle: 4000, cotisationsVersees: 0 }, 2).join() === "4000,4000,4000");
verifier("CELIAPP : plafond à vie sur les cotisations versées, à défaut sur le solde",
  C.celiappParAn({ cotisationAnnuelle: 8000, cotisationsVersees: 36000, solde: 50000 }, 2).join() === "4000,0,0"
  && C.celiappParAn({ cotisationAnnuelle: 8000, cotisationsVersees: null, solde: 35000 }, 1).join() === "5000,0");
const optProj = { annees: 2, anneeDepart: 2026, rendement: 0, reer: { solde: 0, cotisationAnnuelle: 0 }, celi: { solde: 0, cotisationAnnuelle: 0 },
  celiapp: { solde: 0, cotisationAnnuelle: 20000, cotisationsVersees: 0 }, encaisse: 0, maison: { valeur: 0, part: 0, croissance: 0 }, dettes: [] };
const projCa = C.projeterValeurNette(optProj, C.simulerDettes([], { debut: "2026-10", methode: "avalanche" }));
verifier("CELIAPP : la projection verse 8 000 $ par année, au douzième chaque mois", proche(projCa[1].celiapp, 8000, 1e-6) && proche(projCa[2].celiapp, 16000, 1e-6), projCa.map(x => x.celiapp));
const projCa5 = C.projeterValeurNette({ ...optProj, rendement: 5, celiapp: { solde: 0, cotisationAnnuelle: 8000, cotisationsVersees: 0 } }, C.simulerDettes([], { debut: "2026-10", methode: "avalanche" }));
const rm5 = Math.pow(1.05, 1 / 12) - 1, annuite = 8000 / 12 * (Math.pow(1 + rm5, 12) - 1) / rm5;
verifier("CELIAPP à 5 % : versements mensuels, la formule de l'annuité", proche(projCa5[1].celiapp, annuite, 1e-6), { app: projCa5[1].celiapp, annuite });

/* 26. Hypothèque : le privilège de l'année civile, moins ce qui est déjà remboursé ; un terme échu se renouvelle au
   premier mois. Hypothèque 200 000 $, 4 %, 1 200 $ par mois, privilège 10 %, 3 000 $ de plus par mois. */
const hyp26 = { id: "h", nom: "H", type: "hypotheque", solde: 200000, taux: 4, paiement: 1200, frequence: "mois", interetsSeulement: false, finTerme: "2031-01-01", tauxRenouvellement: 4, dureeTerme: 5, privilege: 10, creditImpot: 0 };
const premierMois = (d, debut) => C.simulerDettes([d], { debut, methode: "avalanche", extraMensuel: 30000 }).mois[0];
const iMois = Math.pow(1.02, 1 / 6) - 1, capital = 1200 - 200000 * iMois;
verifier("privilège : au départ, 10 % du solde, moins ce qui est déjà remboursé depuis janvier",
  proche(200000 - capital - premierMois(hyp26, "2026-10").soldes[0], 20000, 1e-6)
  && proche(200000 - capital - premierMois({ ...hyp26, privilegeUtilise: 15000 }, "2026-10").soldes[0], (200000 + 15000) * 0.1 - 15000, 1e-6)
  && proche(200000 - capital - premierMois({ ...hyp26, privilegeUtilise: 15000 }, "2027-01").soldes[0], 20000, 1e-6),
  { oct: 200000 - capital - premierMois({ ...hyp26, privilegeUtilise: 15000 }, "2026-10").soldes[0] });
const echu = C.simulerDettes([{ ...hyp26, finTerme: "2025-11-01", tauxRenouvellement: 6, privilege: 0 }], { debut: "2026-01", methode: "minimum" });
const n0 = C.moisRestants(200000, iMois, 1200), i6 = Math.pow(1.03, 1 / 6) - 1, p6 = 200000 * i6 / (1 - Math.pow(1 + i6, -n0));
verifier("terme échu au début du plan : renouvelé au premier mois, au taux prévu, paiement recalculé ; signalé",
  echu.dettes[0].termeEchu && echu.dettes[0].premierRenouvellement && echu.dettes[0].premierRenouvellement.date.getMonth() === 0
  && echu.dettes[0].premierRenouvellement.date.getFullYear() === 2026 && proche(echu.dettes[0].premierRenouvellement.paiement, p6, 1e-6)
  && !C.simulerDettes([hyp26], { debut: "2026-01", methode: "minimum" }).dettes[0].termeEchu, echu.dettes[0].premierRenouvellement);

/* 29. Correctifs de l'audit L : intérêts d'études au fil des paiements, dividendes avec le FSS,
   salaire et dividendes dans une seule déclaration. */
const pretEtudes = { id: "e", nom: "Prêt d'études", type: "pret", solde: 30000, taux: 5, paiement: 318.20, frequence: "mois", creditImpot: 34 };
const periodesEtudes = C.interetsEtudesPeriodes([pretEtudes], "2026-06", 25);
const sommeEtudes = periodesEtudes.reduce((t, x) => t + x, 0);
const simEtudes = C.simulerDettes([pretEtudes], { debut: "2026-06", methode: "minimum", moisMax: 300 });
verifier("intérêts d'études : la première année est sous 1 500 $, le total suit les paiements, puis 0",
  periodesEtudes[0] > 0 && periodesEtudes[0] < 1500 && proche(sommeEtudes, simEtudes.interetsTotaux, 0.05)
  && proche(sommeEtudes, 8183.46, 0.05) && periodesEtudes[periodesEtudes.length - 1] === 0, { an0: periodesEtudes[0], somme: sommeEtudes });
const div40 = C.impotDividendes(40000);
verifier("dividendes : le FSS de la première bande, 150 $, entre dans le total", proche(div40.fss, 150, 0.01) && proche(div40.total, div40.fed + div40.qc + 150, 1e-6) && proche(div40.total, 2363.52, 0.05), div40);
const persoSep = C.impotMixte({ salaire: 32440, scolarite: 550 });
const socSep = C.impotSociete({ revenu: 200000, depensesPro: 40000, tauxSociete: 0.205, retrait: "tout" });
const uneDec = C.impotSalaireEtSociete({ salaire: 32440, scolarite: 550, revenu: 200000, depensesPro: 40000, fraisSociete: 0, tauxSociete: 0.205, retrait: "tout" });
verifier("transition incorporée : deux déclarations séparées, 11 603,31 $ et 21 146,31 $",
  proche(socSep.dividendes, 127200, 0.01) && proche(persoSep.fed + socSep.fed, 11603.31, 0.05) && proche(persoSep.qc + socSep.qc, 21146.31, 0.05),
  { fed: persoSep.fed + socSep.fed, qc: persoSep.qc + socSep.qc, dividende: socSep.dividendes });
verifier("transition incorporée : une seule déclaration paie davantage, et garde la société",
  uneDec.fed > persoSep.fed + socSep.fed + 500 && uneDec.qc > persoSep.qc + socSep.qc + 500
  && proche(uneDec.societe.dividendes, 127200, 0.01) && proche(uneDec.totalGlobal, uneDec.total + uneDec.societe.impotSociete, 1e-6) && uneDec.rrq > 0,
  { fed: uneDec.fed, qc: uneDec.qc });

console.log(`${reussis} vérifications réussies, ${echecs} échec(s). Écart maximal avec l'outil officiel : ${maxEcart} $.`);
process.exit(echecs ? 1 : 0);
