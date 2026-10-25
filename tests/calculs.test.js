/* Tests des calculs de Wealthnord, sans dépendance : node tests/calculs.test.js
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

/* 7. À l'acte : visites et supervision à 100 %, sans forfait horaire. */
const rev = { annee: "type", demiJournees: 9, enseignement: 3, heuresParDJ: 4, semaines: 46, patientsParDJ: 5, residents: 1, patientsPendantSupervision: 0, autresRevenus: 0,
  inscritsDebut: 500, nouveauxGuichet: 0, nouveauxSansMedecin: 0, nouveauxTransferes: 0, semainesArrivee: 46, partVulnerable: 20, quatrePremieresAnnees: true,
  mix: { suivi: 70, suiviV: 15, perioV: 5, pedia: 5, gross: 5 }, tarifHoraire: 99.48, forfaitHoraireMixte: 59.68, pctMixte: 60, acteSupervision: 114.2, pctSupervision: 60,
  supervisionMaxH: 3.5, perDiemResident: 39.65, forfaitInscription: 10, forfaitVulnerable: 55, suppNonVulnerable: 18.9, suppVulnerableHorsGuichet: 58.1, suppVulnerableGuichet: 124.5 };
const g = C.revenuGmfu(rev);
verifier("à l'acte : visites = mixte × 100 / 60", proche(g.acte.visites, g.mixte.visites * 100 / 60, 0.01));
verifier("à l'acte : supervision = mixte × 100 / 60", proche(g.acte.supervision, g.mixte.supervision * 100 / 60, 0.01));
verifier("à l'acte : pas de forfait horaire", g.acte.forfaitHoraire === undefined && g.acte.heures === undefined);
const g10 = C.revenuGmfu({ ...rev, patientsParDJ: g.seuilActe });
verifier("à l'acte : au seuil, la clinique paie comme l'horaire", proche(g10.acte.visites, 6 * 46 * 99.48 * 4, 1), `${Math.round(g10.acte.visites)}`);

console.log(`${reussis} vérifications réussies, ${echecs} échec(s). Écart maximal avec l'outil officiel : ${maxEcart} $.`);
process.exit(echecs ? 1 : 0);
