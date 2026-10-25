/* WealthMorand — moteur de calcul.
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
    // Déduction pour travailleurs du Québec : 6 % du revenu de travail (emploi ou entreprise), au plus 1 450 $.
    deductionTravailleur: { taux: 0.06, max: 1450 },
    // Salarié : RRQ (part de l'employé), assurance-emploi au taux du Québec, montant canadien pour emploi.
    rrqSalarie: { base: 0.053, supp1: 0.01, supp2: 0.04 },
    ae: { max: 68900, taux: 0.013 },
    montantEmploi: 1501,
    /* Prestations familiales, période de juillet 2026 à juin 2027 (canada.ca et Retraite Québec,
       paramètres repris par la Chaire en fiscalité et en finances publiques). */
    ace: { moins6: 8157, de6a17: 6883, seuil1: 38237, seuil2: 82847,
      taux1: [0, 0.07, 0.135, 0.19, 0.23], base2: [0, 3123, 6022, 8476, 10260], taux2: [0, 0.032, 0.057, 0.08, 0.095] },
    allocationFamille: { max: 3068, min: 1221, seuilCouple: 60398, seuilMono: 44032, taux: 0.04,
      monoMax: 1077, monoMin: 430, fournitures: 127 },
    /* Cotisation au régime public d'assurance médicaments (annexe K) : maximum par adulte selon l'outil
       officiel du ministère des Finances (2026) ; déductions de 2025 indexées de 2,05 %. */
    medicaments: { max: 766, deductions: { seul: 20298, mono1: 32901, mono2: 37207, couple0: 32901, couple1: 37207, couple2: 41187 },
      seuil: 5000, tauxCouple: [0.0393, 0.0589], tauxSeul: [0.0784, 0.1176] },
    // Dividendes non déterminés (société qui profite du taux des PME).
    dividendes: { majoration: 0.15, creditFederal: 0.090301, creditQuebec: 0.0342 },
  };

  /* ---------- Tarifs RAMQ : Manuel des médecins omnipraticiens, rémunération à l'acte, onglet B
     (version Web consultée le 25 octobre 2026). [moins de 500 inscrits, 500 inscrits ou plus],
     patient non vulnérable de moins de 80 ans sauf indication. Deux colonnes : en cabinet (clinique
     privée, GMF), et en CLSC ou en GMF-U en établissement. Codes : suivi 15803-15804 ; suivi d'un
     patient vulnérable 15823-15824 ; périodique d'un patient vulnérable 15819-15820 ; périodique
     pédiatrique 15813-15814 ; suivi de grossesse 15811-15812 ; prise en charge 15801-15802 et, patient
     vulnérable, 15821-15822. Sans rendez-vous, seules les visites ponctuelles se facturent (tableau-
     synthèse des visites, P.G. 2.2.6 A) : mineure 15765-15766, complexe 15773-15774. ---------- */
  const TARIFS_LIEU = {
    cabinet: { suivi: [42.85, 49.15], suiviV: [53.50, 59.80], perioV: [96.35, 112.40], pedia: [66.90, 75.85], gross: [50.20, 57.00],
      pecNonVuln: [85.75, 99.40], pecVuln: [96.35, 110.00], srvMineure: [20.40, 23.55], srvComplexe: [40.80, 47.05] },
    etablissement: { suivi: [32.25, 36.95], suiviV: [40.50, 45.20], perioV: [72.65, 84.80], pedia: [50.30, 57.00], gross: [37.75, 42.85],
      pecNonVuln: [64.50, 74.75], pecVuln: [72.65, 82.90], srvMineure: [15.30, 17.70], srvComplexe: [30.65, 35.40] },
  };
  // Colonne de tarifs : celle choisie, sinon celle de la pratique (cabinet pour la clinique, établissement pour le CLSC et le GMF-U).
  const lieuTarifs = r => ["cabinet", "etablissement"].includes(r.lieuTarifs) ? r.lieuTarifs : r.milieu === "clinique" ? "cabinet" : "etablissement";

  /* ---------- Autres montants de la RAMQ selon le lieu : Brochure no 1 (consultée le 25 octobre 2026).
     EP 40 (médecine de famille) : forfait d'inscription (par. 4.01, depuis le 1er janvier 2019) ;
     forfait annuel d'un patient vulnérable (par. 6.01, depuis le 1er octobre 2019) : groupe I (une
     catégorie de problèmes de santé), et 200 % (groupes III et IV) pour le patient très vulnérable ;
     suppléments à l'inscription d'un patient sans médecin de famille (par. 4.12 et 13.01, depuis le
     1er septembre 2018, codes 19957 à 19960 ; la majoration temporaire du par. 18.01 a pris fin le
     30 avril 2021). EP 42 (médecin enseignant, par. 5.01 et 5.02, depuis le 1er octobre 2019) : demi-per
     diem [résident, externe], liste 1 (régions régulières) ou liste 2 (régions du par. 5.03). ---------- */
  const MONTANTS_LIEU = {
    cabinet: { forfaitInscription: 11.85, forfaitVulnerable: 62.50, forfaitTresVulnerable: 125,
      suppNonVulnerable: 23.55, suppVulnerableHorsGuichet: 72.50, suppVulnerableGuichet: 155.35, suppTresVulnerable: 310.65,
      perDiem: { 1: [55.35, 66.45], 2: [86.95, 98.00] } },
    etablissement: { forfaitInscription: 8.95, forfaitVulnerable: 47, forfaitTresVulnerable: 94,
      suppNonVulnerable: 19.55, suppVulnerableHorsGuichet: 60.15, suppVulnerableGuichet: 128.90, suppTresVulnerable: 257.80,
      perDiem: { 1: [41.45, 49.85], 2: [65.20, 73.55] } },
  };
  // Montants d'un lieu, à plat ; demi-per diem de la liste 1 ou 2.
  function montantsLieu(lieu, liste) {
    const { perDiem, ...m } = MONTANTS_LIEU[lieu === "cabinet" ? "cabinet" : "etablissement"];
    const [perDiemResident, perDiemExterne] = perDiem[+liste === 2 ? 2 : 1];
    return { ...m, perDiemResident, perDiemExterne };
  }
  /* Taux horaire (annexe XIV, depuis le 1er octobre 2019) : 99,48 $ l'heure, à 100 % jusqu'à 1 540 heures
     par année (du 1er juin au 31 mai, par. 5.02) ; le chef de département peut autoriser jusqu'à 880 heures
     de plus (par. 5.10) ; au-delà, 71,8 % (par. 5.04). Mixte en CLSC et en GMF-U (annexe XXIII, sections B-1
     et B-2) : forfait horaire de 59,68 $ et 63,58 % du tarif des services médicaux ; en GMF-U, intervention
     de supervision à 24,87 $ par 15 minutes (99,48 $ l'heure), payée à 62,15 % (services sur base de temps),
     jusqu'à 3,5 heures par demi-journée (B-2, par. 3.1). Membre d'un GMF (EP 33, annexe V, code 08875) :
     9,35 $ par patient inscrit, une fois par année civile, à sa première visite de l'année. */
  const RAMQ = { tarifHoraire: 99.48, heuresMax100: 1540, forfaitHoraireMixte: 59.68, pctMixte: 63.58,
    acteSupervision: 99.48, pctSupervision: 62.15, supervisionMaxH: 3.5, forfaitGmf: 9.35 };
  const PCT_AU_DELA = 71.8;
  const E = TARIFS_LIEU.etablissement;
  const VISITES = [
    { cle: "suivi",  nom: "Suivi",                                 tarifs: E.suivi },
    { cle: "suiviV", nom: "Suivi, patient vulnérable",             tarifs: E.suiviV },
    { cle: "perioV", nom: "Visite périodique, patient vulnérable", tarifs: E.perioV },
    { cle: "pedia",  nom: "Visite périodique pédiatrique",         tarifs: E.pedia },
    { cle: "gross",  nom: "Suivi de grossesse",                    tarifs: E.gross },
  ];
  const PRISE_EN_CHARGE = { nonVuln: E.pecNonVuln, vuln: E.pecVuln };
  // Tarifs par défaut du moteur (colonne établissement) ; l'app passe ceux de la colonne choisie.
  const TARIFS_DEFAUT = { ...E };
  const tarifsDe = r => ({ ...TARIFS_DEFAUT, ...(r.tarifs || {}) });

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
  function tarifVisite(mix, palier, tarifs = TARIFS_DEFAUT) {
    let somme = 0, poids = 0;
    for (const v of VISITES) {
      const w = Math.max(0, +mix[v.cle] || 0);
      somme += w * (+(tarifs[v.cle] || v.tarifs)[palier] || 0);
      poids += w;
    }
    return poids > 0 ? somme / poids : 0;
  }

  /* ============================================================
     REVENU DE LA PRATIQUE : GMF ou clinique, GMF-U, CLSC
     ============================================================
     Taux horaire, mode mixte et à l'acte. Simulation semaine par semaine pour
     suivre l'arrivée des nouveaux patients : le palier de 500 inscrits change
     le tarif des visites, et le forfait annuel d'un patient vulnérable n'est
     payé qu'à partir du mois de son inscription. Les demi-journées de sans
     rendez-vous (SRV) s'ajoutent aux demi-journées de rendez-vous ; les
     activités en établissement (urgence, hospitalisation…) s'ajoutent au
     total, sans frais de cabinet. */
  // Jours (ou quarts) d'une activité par année, selon sa fréquence.
  function joursActivite(a, semaines) {
    const n = Math.max(0, a.nombre || 0);
    return a.frequence === "semaine" ? n * semaines : a.frequence === "mois" ? n * 12
      : a.frequence === "cycle" ? n * 52 / Math.max(1, a.cycle || 1) : n;
  }
  // Une activité : revenu par jour donné, ou patients par jour × revenu moyen par patient.
  function revenuActivite(a, semaines) {
    const parJour = a.calcul === "patients" ? Math.max(0, a.patients || 0) * Math.max(0, a.parPatient || 0) : Math.max(0, a.parJour || 0);
    const jours = joursActivite(a, semaines);
    return { jours, parJour, total: jours * parJour };
  }
  /* Volume de patients (EP 40), par année civile, versé en juin de l'année suivante : montant
     supplémentaire selon les inscrits actifs au 31 décembre (par. 4.15 : 7 500 $ de 750 à 999,
     15 000 $ à 1 000 et plus) et suppléments par patient au-delà des seuils (par. 15.01, depuis le
     1er janvier 2019), si le taux d'assiduité atteint 80 % (par. 15.03). */
  const VOLUME_INSCRITS = [[500, 0], [750, 5.23], [1000, 10.46], [1500, 15.69], [Infinity, 20.92]];
  const VOLUME_VULNERABLES = [[200, 0], [300, 5.23], [500, 10.46], [Infinity, 15.69]];
  function montantsVolume(inscrits, vulnerables, assiduite = true) {
    const n = Math.round(inscrits), nv = Math.round(vulnerables);
    const montant = n >= 1000 ? 15000 : n >= 750 ? 7500 : 0;
    const supplements = assiduite ? parTranches(n, VOLUME_INSCRITS) + parTranches(nv, VOLUME_VULNERABLES) : 0;
    return { montant, supplements, total: montant + supplements };
  }
  /* Pratique polyvalente (EP 40, par. 16.00) : majoration de la rémunération des activités en
     établissement (urgence, hospitalisation, CHSLD, obstétrique, soins palliatifs), selon les inscrits
     actifs au 31 décembre : 2,5 %, 5 % ou 10 %, avec des seuils plus bas pendant les quatre premières
     années de pratique (par. 16.04). Au-delà de 245 patients vulnérables, chacun compte pour 2,5 (par. 16.03). */
  const SEUILS_POLYVALENCE = { 1: [100, 200, 300], 2: [250, 400, 600], 3: [400, 600, 900], 4: [550, 800, 1200], 5: [700, 1000, 1500] };
  const ACTIVITES_POLYVALENTES = ["urgence", "hospitalisation", "obstetrique", "palliatifs", "chsld"];
  function tauxPolyvalence(inscrits, vulnerables, anneePratique) {
    const n = Math.round(inscrits + Math.max(0, vulnerables - 245) * 1.5);
    const [a, b, c] = SEUILS_POLYVALENCE[borne(Math.floor(+anneePratique || 5), 1, 5)];
    return n >= c ? 10 : n >= b ? 5 : n >= a ? 2.5 : 0;
  }
  function revenuGmfu(r) {
    const W = Math.max(0, r.semaines), N = r.demiJournees, H = r.heuresParDJ, TF = tarifsDe(r);
    // Montants de la RAMQ : ceux saisis, sinon ceux de la brochure pour le lieu (cabinet ou établissement).
    const D = { ...RAMQ, ...montantsLieu(lieuTarifs(r), r.listeEnseignement) }, m = k => r[k] ?? D[k];
    const SRV = Math.max(0, r.demiJourneesSRV || 0), patientsSRV = Math.max(0, r.patientsSRV || 0);
    const T = Math.min(r.enseignement, N), C = Math.max(N - T, 0);
    const heuresSup = Math.min(H, m("supervisionMaxH"));
    // Clientèle : non vulnérables, vulnérables et très vulnérables (parts des inscrits).
    const vt = borne((r.partTresVulnerable || 0) / 100, 0, 1), v = borne(r.partVulnerable / 100, 0, 1 - vt), nv = 1 - v - vt;
    const premiere = r.annee === "premiere";
    // Apprenants en GMF-U : visites des résidents et des externes par demi-journée d'enseignement.
    // À l'acte, le superviseur les facture ; au mixte, il choisit pour la demi-journée ces visites ou
    // l'intervention de supervision (annexe XXIII, B-2, par. 3.1) ; au taux horaire, ses heures sont payées.
    const resid = Math.max(0, r.residents || 0), ext = Math.max(0, r.externes || 0);
    const parSupervision = r.supervisionFacturation === "visites";
    const apprenants = resid * (r.patientsParResident ?? 4.5) + ext * (r.patientsParExterne ?? 2.5);
    // Sans rendez-vous : part des visites ponctuelles complexes.
    const pc = borne((r.pctSrvComplexe || 0) / 100, 0, 1);
    const tarifSrv = palier => (1 - pc) * TF.srvMineure[palier] + pc * TF.srvComplexe[palier];
    // Majoration selon le territoire (annexes XII et XII-A) : sur les visites, les heures, la supervision,
    // les demi-per diem, les activités, et les forfaits d'inscription et annuels (EP 40, par. 4.02 et 6.01 C) ;
    // pas sur les suppléments à l'inscription ni sur les montants liés au volume.
    const maj = 1 + (r.majorationPct || 0) / 100;

    const nouveaux = premiere ? r.nouveauxGuichet + r.nouveauxSansMedecin + r.nouveauxTransferes : 0;
    const etalement = Math.max(1, Math.min(W, r.semainesArrivee || W));
    let inscrits = premiere ? r.inscritsDebut : r.inscritsDebut + r.nouveauxGuichet + r.nouveauxSansMedecin + r.nouveauxTransferes;
    const inscritsDepart = inscrits;
    const forfaitAnnuel = v * m("forfaitVulnerable") + vt * m("forfaitTresVulnerable");

    let visitesMixte = 0, visitesAppr = 0, visitesSrv = 0, nbVisites = 0, nbPriseEnCharge = 0, forfaitVulnNouveaux = 0, semainesPalierHaut = 0;
    for (let k = 0; k < W; k++) {
      const palier = inscrits >= 499.999 ? 1 : 0;
      if (palier) semainesPalierHaut++;
      const arrivees = k < etalement ? nouveaux / etalement : 0;
      const visitesSem = C * r.patientsParDJ;
      const pec = Math.min(arrivees, visitesSem);
      const tarifPec = nv * TF.pecNonVuln[palier] + (v + vt) * TF.pecVuln[palier];
      const tv = tarifVisite(r.mix, palier, TF);
      visitesMixte += pec * tarifPec + (visitesSem - pec) * tv + T * (r.patientsPendantSupervision || 0) * tv;
      visitesAppr += T * apprenants * tv;
      visitesSrv += SRV * patientsSRV * tarifSrv(palier);
      nbVisites += visitesSem + T * (r.patientsPendantSupervision || 0) + T * apprenants + SRV * patientsSRV;
      nbPriseEnCharge += pec;
      // Forfait vulnérable : payé à partir du mois d'inscription (EP 40, par. 6.01).
      const mois = Math.floor((k / W) * 12);
      forfaitVulnNouveaux += arrivees * forfaitAnnuel * (12 - mois) / 12;
      inscrits += arrivees;
    }
    const inscritsFin = inscrits, vulnerablesFin = inscritsFin * (v + vt);

    // Forfaits, suppléments et montants liés au volume : identiques dans tous les modes.
    const forfaitInscription = inscritsFin * m("forfaitInscription") * maj;   // payé en entier (EP 40, par. 4.08)
    const forfaitVulnerable = (inscritsDepart * forfaitAnnuel + forfaitVulnNouveaux) * maj;
    let supplements = 0;
    if (premiere) {
      // Patient sans médecin de famille : non vulnérable (19957), vulnérable hors guichet (19958),
      // vulnérable du guichet (19959), très vulnérable du guichet (19960).
      supplements += r.nouveauxGuichet * (nv * m("suppNonVulnerable") + v * m("suppVulnerableGuichet") + vt * m("suppTresVulnerable"));
      supplements += r.nouveauxSansMedecin * (nv * m("suppNonVulnerable") + (v + vt) * m("suppVulnerableHorsGuichet"));
      // Prime d'inscription individuelle d'une entente ponctuelle, par nouveau patient (0 si aucune).
      supplements += (r.nouveauxGuichet + r.nouveauxSansMedecin) * (r.primeInscription || 0);
    }
    const detailVolume = montantsVolume(inscritsFin, vulnerablesFin, r.assiduite80 !== false), volume = detailVolume.total;
    // Forfait GMF : chaque nouveau patient à son inscription, et les inscrits vus au moins une fois dans l'année.
    const patientsVus = nouveaux + inscritsDepart * borne((r.pctPatientsVus ?? 80) / 100, 0, 1);
    const forfaitGmfPossible = patientsVus * m("forfaitGmf"), forfaitGmf = r.membreGmf ? forfaitGmfPossible : 0;
    const perDiem = W * T * (resid * m("perDiemResident") + ext * m("perDiemExterne")) * maj;
    const detailActivites = (r.activites || []).map(a => revenuActivite(a, W));
    const activites = detailActivites.reduce((t, x) => t + x.total, 0) * maj, autres = r.autresRevenus || 0;
    // Pratique polyvalente : sur les activités qui y donnent droit, sans la majoration du territoire (par. 16.02).
    const anneePratique = premiere ? 1 : borne(Math.floor(+r.anneePratique || 5), 1, 5);
    const pctPolyvalence = tauxPolyvalence(inscritsFin, vulnerablesFin, anneePratique);
    const basePolyvalence = (r.activites || []).reduce((t, a, i) => t + (ACTIVITES_POLYVALENTES.includes(a.type) ? detailActivites[i].total : 0), 0);
    const polyvalence = basePolyvalence * pctPolyvalence / 100;
    const commun = forfaitInscription + forfaitVulnerable + forfaitGmf + supplements + volume + perDiem + activites + polyvalence + autres;
    const base = { perDiem, forfaitInscription, forfaitVulnerable, forfaitGmf, supplements, volume, activites, polyvalence, autres };

    // Taux horaire : à 100 % jusqu'au plafond annuel, puis 71,8 % du tarif (annexe XIV, par. 5.02 et 5.04).
    const heures = W * (N + SRV) * H, plafondHeures = Math.max(0, m("heuresMax100"));
    const heuresAuDela = Math.max(0, heures - plafondHeures), perteHeures = heuresAuDela * (1 - PCT_AU_DELA / 100) * m("tarifHoraire") * maj;
    const horaire = { heures: (heures - heuresAuDela * (1 - PCT_AU_DELA / 100)) * m("tarifHoraire") * maj, ...base };
    horaire.total = horaire.heures + commun;
    // Mixte : forfait horaire, part du tarif des visites et, en GMF-U, l'intervention de supervision
    // pour la demi-journée d'enseignement, ou les visites des apprenants.
    const mixte = {
      forfaitHoraire: heures * m("forfaitHoraireMixte") * maj,
      visites: (visitesMixte + visitesSrv + (parSupervision ? visitesAppr : 0)) * maj * m("pctMixte") / 100,
      supervision: parSupervision ? 0 : W * T * heuresSup * m("acteSupervision") * maj * m("pctSupervision") / 100,
      ...base,
    };
    mixte.total = mixte.forfaitHoraire + mixte.visites + mixte.supervision + commun;
    // À l'acte : chaque visite au tarif de l'entente (100 % par défaut), celles des apprenants comprises
    // (l'intervention de supervision n'existe qu'au mixte), sans forfait horaire.
    const pctActe = r.pctActe ?? 100;
    const acte = { visites: (visitesMixte + visitesSrv + visitesAppr) * maj * pctActe / 100, ...base };
    acte.total = acte.visites + commun;
    // Frais de cabinet (loyer, personnel, équipement) remis à la clinique : un pourcentage
    // de la facturation RAMQ de la clinique (sans les activités en établissement ni les autres
    // revenus) et un montant fixe, moins la compensation de la RAMQ. À l'acte seulement, sauf
    // si la clinique les exige aussi au taux horaire et au mixte.
    const frais = (x, applique) => !applique ? 0 : Math.max(0,
      (x.total - activites - polyvalence - autres) * (r.fraisCabinetPct || 0) / 100 + (r.fraisCabinetMois || 0) * 12 - (r.compensationCabinet || 0));
    horaire.fraisCabinet = frais(horaire, r.fraisCabinetTousModes);
    mixte.fraisCabinet = frais(mixte, r.fraisCabinetTousModes);
    acte.fraisCabinet = frais(acte, true);

    // Seuil : nombre de patients par demi-journée clinique où le mixte égale l'horaire (à 100 % du tarif horaire).
    const parVisite = tarifVisite(r.mix, inscritsFin >= 499.999 ? 1 : 0, TF) * maj * m("pctMixte") / 100;
    const seuil = parVisite > 0 ? (m("tarifHoraire") - m("forfaitHoraireMixte")) * maj * H / parVisite : null;
    const parVisiteActe = tarifVisite(r.mix, inscritsFin >= 499.999 ? 1 : 0, TF) * maj * pctActe / 100;
    // Au seuil, chaque visite à l'acte, après le pourcentage remis à la clinique, égale l'heure au taux horaire.
    const netVisite = parVisiteActe * (1 - (r.fraisCabinetPct || 0) / 100) / (r.fraisCabinetTousModes ? 1 - (r.fraisCabinetPct || 0) / 100 : 1);
    const seuilActe = netVisite > 0 ? m("tarifHoraire") * maj * H / netVisite : null;

    // Revenu moyen par patient, à 100 % du tarif, au palier de fin d'année : rendez-vous et sans rendez-vous.
    const palierFin = inscritsFin >= 499.999 ? 1 : 0;
    const tarifMoyenRdv = tarifVisite(r.mix, palierFin, TF) * maj, tarifMoyenSrv = tarifSrv(palierFin) * maj;
    // Hausse du tarif moyen d'une visite au palier de 500 inscrits.
    const t0 = tarifVisite(r.mix, 0, TF), gainPalier = t0 > 0 ? tarifVisite(r.mix, 1, TF) / t0 - 1 : 0;
    return { heures, heuresAuDela, plafondHeures, perteHeures, nbVisites, nbPriseEnCharge, inscritsDepart, inscritsFin, vulnerablesFin, semainesPalierHaut, gainPalier,
      patientsVus, forfaitGmfPossible, activites, detailActivites, basePolyvalence, polyvalence, pctPolyvalence, anneePratique, detailVolume,
      visitesApprenants: W * T * apprenants, tarifMoyenRdv, tarifMoyenSrv,
      horaire, mixte, acte, ecart: mixte.total - horaire.total, seuilPatients: seuil, seuilActe };
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

  const deductionTravailleur = revenuTravail => Math.min(P2026.deductionTravailleur.max, Math.max(0, revenuTravail) * P2026.deductionTravailleur.taux);

  /* Revenu de travail autonome (RAMQ), moins les dépenses et le REER.
     interetsEtudes : intérêts payés sur un prêt de l'aide financière aux études.
     Rend aussi le revenu net fédéral et québécois, qui servent aux prestations familiales. */
  // autresImposables : revenus imposables qui ne sont pas du travail (location nette, placements
  // hors REER et CELI) : sans RRQ ni RQAP. reer : REER et CELIAPP, déductibles.
  function impotParticulier(o) {
    const revenuNetAffaires = Math.max(0, o.revenu - (o.depensesPro || 0)), autres = Math.max(0, o.autresImposables || 0);
    const c = cotisationsAutonome(revenuNetAffaires);
    const imposableFed = Math.max(0, revenuNetAffaires - c.deduction - (o.reer || 0) + autres);
    const imposableQc = Math.max(0, imposableFed - deductionTravailleur(revenuNetAffaires));
    const ie = o.interetsEtudes || 0;
    const { fed, qc } = impotsDeBase(imposableFed, imposableQc, c.creditFederal, 0,
      ie * P2026.creditInteretsEtudes.federal, ie * P2026.creditInteretsEtudes.quebec);
    const cotisationFss = fss(revenuNetAffaires + autres);
    const total = fed + qc + c.rrq + c.rqap + cotisationFss;
    return { revenu: o.revenu, autres, imposable: imposableFed, imposableQc, revenuNetFed: imposableFed, revenuNetQc: imposableQc,
      fed, qc, rrq: c.rrq, rqap: c.rqap, ae: 0, fss: cotisationFss, total, totalGlobal: total,
      net: o.revenu + autres - total, tauxMoyen: o.revenu + autres > 0 ? total / (o.revenu + autres) : 0 };
  }

  /* Salarié : RRQ, RQAP et assurance-emploi de l'employé. Déductions : cotisations
     supplémentaires au RRQ, régime de retraite (RPA), cotisations syndicales, REER ;
     au Québec, déduction pour travailleurs. Crédits fédéraux : montant de base,
     montant canadien pour emploi, RRQ de base, AE et RQAP. Aucune cotisation au FSS
     sur un salaire (l'employeur la paie). */
  function impotSalarie(o) {
    const s = Math.max(0, o.salaire || 0), q = P2026.rrq, r = P2026.rrqSalarie;
    const assiette = borne(s - q.exemption, 0, q.mga - q.exemption);
    const rrqBase = assiette * r.base, rrqSupp = assiette * r.supp1 + borne(Math.min(s, q.mgs) - q.mga, 0, q.mgs - q.mga) * r.supp2;
    const rqap = Math.min(s, P2026.rqap.max) * P2026.rqap.salarie;
    const ae = Math.min(s, P2026.ae.max) * P2026.ae.taux;
    const autres = Math.max(0, o.autresRevenus || 0);
    const netFed = Math.max(0, s + autres - rrqSupp - (o.rpa || 0) - (o.syndicat || 0) - (o.reer || 0));
    const netQc = Math.max(0, netFed - deductionTravailleur(s));
    const creditsFed = Math.min(P2026.montantEmploi, s) + rrqBase + ae + rqap;
    const { fed, qc } = impotsDeBase(netFed, netQc, creditsFed, 0, 0, 0);
    const total = fed + qc + rrqBase + rrqSupp + rqap + ae;
    const brut = s + autres;
    return { revenu: brut, imposable: netFed, imposableQc: netQc, revenuNetFed: netFed, revenuNetQc: netQc,
      fed, qc, rrq: rrqBase + rrqSupp, rqap, ae, fss: 0, total,
      net: brut - total - (o.rpa || 0) - (o.syndicat || 0), tauxMoyen: brut > 0 ? total / brut : 0 };
  }

  /* Conjoints : le conjoint au revenu le plus élevé réclame le montant pour conjoint
     (fédéral) et reçoit les crédits non utilisés de l'autre (Québec). Rend des copies
     ajustées des deux résultats. */
  function transfertsConjoints(a, b) {
    const f = P2026.federal, q = P2026.quebec;
    const [haut, bas] = a.revenuNetFed >= b.revenuNetFed ? [a, b] : [b, a];
    const bpaHaut = haut.revenuNetFed <= f.tranches[2][0] ? f.bpaMax : haut.revenuNetFed >= f.tranches[3][0] ? f.bpaMin
      : f.bpaMax - (f.bpaMax - f.bpaMin) * (haut.revenuNetFed - f.tranches[2][0]) / (f.tranches[3][0] - f.tranches[2][0]);
    const montantConjoint = Math.min(haut.fed, Math.max(0, bpaHaut - bas.revenuNetFed) * f.tauxCredit * (1 - f.abattementQc));
    const inutilises = Math.min(haut.qc, Math.max(0, q.montantBase * q.tauxCredit - parTranches(bas.revenuNetQc, q.tranches)));
    const ajuste = r => r === haut
      ? { ...r, fed: r.fed - montantConjoint, qc: r.qc - inutilises, total: r.total - montantConjoint - inutilises,
          totalGlobal: (r.totalGlobal ?? r.total) - montantConjoint - inutilises, net: r.net + montantConjoint + inutilises, transferts: montantConjoint + inutilises }
      : { ...r, transferts: 0 };
    return [ajuste(a), ajuste(b)];
  }

  /* Allocation canadienne pour enfants, Allocation famille et supplément pour
     fournitures scolaires, calculés sur le revenu net familial de l'année. */
  function prestationsFamille(o) {
    const ages = (o.ages || []).filter(a => a < 18), n = Math.min(4, ages.length);
    if (!n) return { ace: 0, allocationFamille: 0, fournitures: 0, total: 0 };
    const a = P2026.ace;
    const maxAce = ages.reduce((s, x) => s + (x < 6 ? a.moins6 : a.de6a17), 0);
    const rfnr = Math.max(0, o.revenuNetFed || 0);
    const reductionAce = rfnr <= a.seuil1 ? 0 : rfnr <= a.seuil2 ? (rfnr - a.seuil1) * a.taux1[n] : a.base2[n] + (rfnr - a.seuil2) * a.taux2[n];
    const ace = Math.max(0, maxAce - reductionAce);
    const f = P2026.allocationFamille, couple = o.couple !== false;
    const max = ages.length * f.max + (couple ? 0 : f.monoMax), min = ages.length * f.min + (couple ? 0 : f.monoMin);
    const allocationFamille = Math.max(min, max - Math.max(0, (o.revenuNetQc || 0) - (couple ? f.seuilCouple : f.seuilMono)) * f.taux);
    const fournitures = ages.filter(x => x >= 4 && x <= 16).length * f.fournitures;
    return { ace, allocationFamille, fournitures, total: ace + allocationFamille + fournitures };
  }

  /* Cotisation au régime public d'assurance médicaments, par adulte couvert. */
  function primeMedicaments(o) {
    const m = P2026.medicaments, enfants = Math.min(2, (o.ages || []).filter(a => a < 18).length);
    const cle = o.couple ? "couple" + enfants : enfants ? "mono" + enfants : "seul";
    const base = Math.max(0, (o.revenuNetQc || 0) - m.deductions[cle]);
    const [t1, t2] = o.couple ? m.tauxCouple : m.tauxSeul;
    const parAdulte = Math.min(m.max, base <= m.seuil ? base * t1 : m.seuil * t1 + (base - m.seuil) * t2);
    return { parAdulte, total: parAdulte * (o.adultesCouverts || 0) };
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
  /* Médecin incorporé : la société reçoit les paiements de la RAMQ, paie les dépenses
     et son impôt (taux combiné ; au Québec, la déduction pour petite entreprise exige
     5 500 heures rémunérées, rare pour une société de médecin), puis verse des
     dividendes non déterminés : tout le bénéfice après impôt, ou un montant fixe. Le
     reste demeure dans la société. Même format que impotParticulier, pour la personne ;
     totalGlobal ajoute l'impôt de la société. */
  function impotSociete(o) {
    const profit = Math.max(0, o.revenu - (o.depensesPro || 0) - (o.fraisSociete || 0));
    const impotSoc = profit * o.tauxSociete;
    const disponible = profit - impotSoc;
    const dividendes = o.retrait === "fixe" ? Math.min(disponible, Math.max(0, o.retraitFixe || 0)) : disponible;
    const d = P2026.dividendes, majore = dividendes * (1 + d.majoration), autres = Math.max(0, o.autresImposables || 0);
    const imposable = Math.max(0, majore + autres - (o.reer || 0));
    const ie = o.interetsEtudes || 0;
    const { fed, qc } = impotsDeBase(imposable, imposable, 0, 0,
      majore * d.creditFederal + ie * P2026.creditInteretsEtudes.federal, majore * d.creditQuebec + ie * P2026.creditInteretsEtudes.quebec);
    const cotisationFss = fss(majore + autres);
    const total = fed + qc + cotisationFss;
    return { revenu: o.revenu, autres, dividendes, imposable, imposableQc: imposable, revenuNetFed: imposable, revenuNetQc: imposable,
      fed, qc, rrq: 0, rqap: 0, ae: 0, fss: cotisationFss, total, totalGlobal: total + impotSoc,
      net: dividendes + autres - total, tauxMoyen: o.revenu + autres > 0 ? (total + impotSoc) / (o.revenu + autres) : 0,
      societe: { profit, impotSociete: impotSoc, disponible, dividendes, retenu: disponible - dividendes, frais: o.fraisSociete || 0, depenses: o.depensesPro || 0 } };
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
  /* Taux mensuel effectif. Hypothèque à taux fixe au Canada : intérêt composé
     deux fois par année (Loi sur l'intérêt), soit (1 + t/2)^(1/6) - 1 par mois.
     Marge, prêts et hypothèque à taux variable : t/12. */
  function tauxMensuel(d, taux) {
    return d.type === "hypotheque" && !d.tauxVariable ? Math.pow(1 + taux / 200, 1 / 6) - 1 : taux / 1200;
  }
  // Nombre de mois pour rembourser un solde avec ce paiement (Infinity si le paiement ne couvre pas l'intérêt).
  function moisRestants(solde, i, paiement) {
    if (solde <= 0) return 0;
    if (paiement <= solde * i) return Infinity;
    return i === 0 ? solde / paiement : -Math.log(1 - solde * i / paiement) / Math.log(1 + i);
  }
  // Paiement qui rembourse le solde en n mois.
  const paiementPour = (solde, i, n) => n <= 0 ? solde : i === 0 ? solde / n : solde * i / (1 - Math.pow(1 + i, -n));

  /* Simulation mois par mois. Le budget consacré aux dettes (paiements
     minimums de départ + montant en plus) reste le même : chaque dette
     remboursée libère son paiement pour les suivantes.
     o.extraParAnnee(a) donne le montant en plus de l'année a (revenus et
     dépenses qui évoluent) ; o.ecartTaux décale les taux variables et les
     taux de renouvellement (scénarios) ; o.continuerApres prolonge la
     simulation après la dernière dette pour suivre l'argent libéré. */
  function simulerDettes(dettes, o) {
    const debut = new Date(o.debut + "-01T00:00:00");
    const ecart = o.ecartTaux || 0;
    const ds = dettes.map(d => {
      const x = {
        ...d, s: Math.max(0, +d.solde || 0), interets: 0, interetsNets: 0, fin: null,
        paiementMensuel: d.frequence === "2sem" ? d.paiement * 26 / 12 : d.paiement,
        finTerme: d.finTerme ? new Date(d.finTerme + "T00:00:00") : null,
        privilegeRestant: Infinity,
      };
      // Taux variable (marge) : l'écart du scénario s'applique tout de suite.
      x.tauxCourant = d.type === "marge" ? Math.max(0, d.taux + ecart) : d.taux;
      // Amortissement restant au départ, gardé au renouvellement (on ne le rallonge pas).
      x.nRestant = d.type === "hypotheque" && !d.interetsSeulement ? moisRestants(x.s, tauxMensuel(d, x.tauxCourant), x.paiementMensuel) : Infinity;
      return x;
    });
    const mois = [], parAn = [];
    let interetsTotaux = 0, interetsNetsTotaux = 0, extraLibre, reserve = 0, gainsAttente = 0;
    // L'argent en attente (plafond de remboursement anticipé atteint) est placé à court terme
    // jusqu'au prochain droit de remboursement : 2,4 % par an selon les normes de projection 2026.
    const rAttente = Math.pow(1 + (o.rendementAttente ?? 2.4) / 100, 1 / 12) - 1;
    const max = o.moisMax || 480;
    const minimumsDepart = ds.reduce((a, d) => a + (d.interetsSeulement ? d.s * tauxMensuel(d, d.tauxCourant) : d.paiementMensuel), 0);
    const extraAnnee = a => o.extraParAnnee ? Math.max(0, o.extraParAnnee(a)) : (o.extraMensuel || 0);
    for (let m = 0; m < max; m++) {
      const date = new Date(debut.getFullYear(), debut.getMonth() + m, 1);
      const budget = o.methode === "minimum" ? null : minimumsDepart + extraAnnee(Math.floor(m / 12));
      if (date.getMonth() === 0 || m === 0) {
        ds.forEach(d => { d.privilegeRestant = d.type === "hypotheque" ? d.s * (d.privilege || 0) / 100 : Infinity; });
      }
      let interetsMois = 0, interetsEtudes = 0, minimumsPayes = 0;
      for (const d of ds) {
        // Renouvellement : à la fin du terme, puis à chaque nouveau terme (5 ans par défaut).
        const moisDepuis = d.finTerme ? (date.getFullYear() - d.finTerme.getFullYear()) * 12 + date.getMonth() - d.finTerme.getMonth() : -1;
        d.auRenouvellement = moisDepuis >= 0 && moisDepuis % (12 * (d.dureeTerme || 5)) === 0;
        if (d.s <= 0.005) continue;
        if (d.auRenouvellement) {
          d.tauxCourant = Math.max(0, (d.tauxRenouvellement || d.taux) + ecart);
          // Nouveau paiement : même amortissement restant, au nouveau taux.
          if (isFinite(d.nRestant) && d.nRestant > 0) d.paiementMensuel = paiementPour(d.s, tauxMensuel(d, d.tauxCourant), d.nRestant);
          if (!d.premierRenouvellement) d.premierRenouvellement = { date, taux: d.tauxCourant, paiement: d.paiementMensuel, solde: d.s };
        }
        const i = d.s * tauxMensuel(d, d.tauxCourant);
        d.interets += i; interetsMois += i;
        d.interetsNets += i * (1 - (d.creditImpot || 0) / 100);
        interetsNetsTotaux += i * (1 - (d.creditImpot || 0) / 100);
        if (d.creditImpot) interetsEtudes += i;
        const paye = Math.min(d.s + i, d.interetsSeulement ? i : d.paiementMensuel);
        minimumsPayes += paye;
        d.s = d.s + i - paye;
        if (isFinite(d.nRestant)) d.nRestant = Math.max(0, d.nRestant - 1);
        if (d.s <= 0.005) { d.s = 0; d.fin = d.fin || date; }
      }
      // L'extra qui n'a pas pu être versé (plafond de remboursement anticipé
      // atteint) est mis de côté et versé dès que possible : en janvier ou
      // au renouvellement.
      const gain = reserve * rAttente; gainsAttente += gain;
      let extra = budget === null ? 0 : Math.max(0, budget - minimumsPayes) + reserve + gain;
      if (budget !== null && o.forfaitsAnnuels && date.getMonth() === (o.moisForfait ?? 3)) extra += o.forfaitsAnnuels;
      // Répartition de l'extra.
      // Avalanche : taux réel le plus élevé d'abord. Boule de neige : plus petit solde d'abord.
      // Hybride : d'abord le droit de remboursement anticipé des hypothèques encore disponible
      // cette année (il se perd au 1er janvier), puis l'avalanche.
      const privilegeDispo = d => d.type === "hypotheque" && !d.auRenouvellement && d.privilegeRestant > 0.5 ? 1 : 0;
      const ordre = ds.filter(d => d.s > 0.005).sort((a, b) =>
        o.methode === "boule" ? a.s - b.s
        : o.methode === "hybride" ? (privilegeDispo(b) - privilegeDispo(a)) || (tauxReel(b) - tauxReel(a))
        : tauxReel(b) - tauxReel(a));
      for (const d of ordre) {
        if (extra <= 0) break;
        // Au renouvellement, le remboursement anticipé n'a pas de plafond.
        const plafond = d.type === "hypotheque" && !d.auRenouvellement ? d.privilegeRestant : Infinity;
        const verse = Math.min(extra, d.s, plafond);
        d.s -= verse; extra -= verse;
        if (d.type === "hypotheque" && !d.auRenouvellement) d.privilegeRestant -= verse;
        if (d.s <= 0.005) { d.s = 0; d.fin = d.fin || date; }
      }
      const resteDesDettes = ds.some(d => d.s > 0.005);
      reserve = resteDesDettes ? extra : 0;
      extraLibre = resteDesDettes ? 0 : extra;
      interetsTotaux += interetsMois;
      // reserve : argent mis de côté en attendant le prochain droit de remboursement anticipé (un actif).
      mois.push({ date, soldes: ds.map(d => d.s), total: ds.reduce((a, d) => a + d.s, 0), extraLibre, reserve, interetsEtudes });
      if (ds.every(d => d.s <= 0.005) && (o.continuerApres ? m >= (o.continuerApres - 1) : true)) break;
    }
    // Intérêts sur les prêts d'études par année civile (pour le crédit d'impôt).
    for (const x of mois) {
      const a = x.date.getFullYear();
      const e = parAn.find(p => p.annee === a) || (parAn.push({ annee: a, interetsEtudes: 0 }), parAn[parAn.length - 1]);
      e.interetsEtudes += x.interetsEtudes;
    }
    const iLibre = mois.findIndex(x => x.total <= 0.005);
    return { mois, dettes: ds.map(d => ({ id: d.id, nom: d.nom, fin: d.fin, interets: d.interets, interetsNets: d.interetsNets, tauxFinal: d.tauxCourant, premierRenouvellement: d.premierRenouvellement || null })),
      interetsTotaux, interetsNetsTotaux, gainsAttente, coutNet: interetsNetsTotaux - gainsAttente,
      libre: iLibre >= 0 ? mois[iLibre].date : null, iLibre, parAn };
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

  /* Valeur nette projetée, mois par mois, à partir de la simulation des
     dettes prolongée jusqu'à l'horizon. Les placements croissent au taux
     mensuel équivalent ; les cotisations sont versées chaque mois ; l'argent
     libéré par la dernière dette est investi (CELI). Chaque paiement
     d'hypothèque réduit la dette : le capital remboursé devient de l'équité
     dans la maison, dont la valeur croît chaque année. */
  function projeterValeurNette(o, simulation) {
    const ans = o.annees || 20;
    // Rendement mensuel de l'année a : constant, ou tiré d'une suite de rendements annuels (simulations).
    const rmDe = a => Math.pow(1 + (o.rendements ? o.rendements[a - 1] : o.rendement) / 100, 1 / 12) - 1;
    const rmSocDe = a => Math.pow(1 + (o.rendements ? o.rendements[a - 1] : o.rendement) / 100 * (1 - (o.societe && o.societe.impotPlacement != null ? o.societe.impotPlacement : 0.5)), 1 / 12) - 1;
    const voitures = o.voitures || [];
    let reer = o.reer.solde, celi = o.celi.solde, conj = o.actifsConjoint || 0, soc = o.societe ? o.societe.solde || 0 : 0;
    // CELIAPP : cotisations jusqu'au plafond à vie (40 000 $), croissance à l'abri de l'impôt.
    const ca = o.celiapp || { solde: 0, cotisationAnnuelle: 0 };
    let celiapp = ca.solde || 0, cumulCeliapp = ca.solde || 0;
    // Placements de la société : rendement après l'impôt de la société sur le revenu de placement (rmSocDe).
    // Autos : chacune perd de la valeur chaque année ; si un remplacement est prévu, une auto
    // neuve est achetée tous les N ans (prix indexé à l'inflation), payée avec l'épargne.
    const autos = voitures.map(v => ({ ...v, valeurCourante: v.valeur, age: 0 }));
    const inflation = (o.inflation || 0) / 100, remplacement = o.remplacementAutos || null;
    const encaisse = o.encaisse || 0;
    // Autres actifs (chalet, terrain, équipement…) : leur valeur croît, ou baisse, chaque année.
    const autresActifs = o.autresActifs || [];
    // Objectifs d'épargne dans un compte dédié : versements jusqu'au mois visé ; l'argent d'un
    // objectif à dépenser (auto, voyage, congé) sort ce mois-là, celui d'un fonds d'urgence reste.
    const objectifs = (o.objectifs || []).map(x => ({ ...x, s: x.solde || 0 }));
    const res = [];
    const soldesAu = a => {
      if (a === 0) return o.dettes.map(d => Math.max(0, +d.solde || 0));
      const m = simulation.mois[a * 12 - 1];
      return m ? m.soldes : o.dettes.map(() => 0);
    };
    for (let a = 0; a <= ans; a++) {
      if (a > 0) {
        const rm = rmDe(a), rmSoc = rmSocDe(a);
        for (let k = (a - 1) * 12; k < a * 12; k++) {
          const libre = simulation.mois[k] ? simulation.mois[k].extraLibre : (simulation.mois.length ? simulation.mois[simulation.mois.length - 1].extraLibre : 0);
          reer = reer * (1 + rm) + o.reer.cotisationAnnuelle / 12;
          // Sans remboursement accéléré (minimums seulement), le surplus du mois est épargné.
          celi = celi * (1 + rm) + o.celi.cotisationAnnuelle / 12 + (libre || 0) + (o.ajoutMensuel ? Math.max(0, o.ajoutMensuel(a - 1)) : 0);
          conj = conj * (1 + rm) + (o.epargneConjointe || 0) * Math.pow(1 + (o.hausseEpargneConjointe || 0) / 100, a - 1);
          const cCeliapp = k % 12 === 0 ? Math.min(ca.cotisationAnnuelle || 0, Math.max(0, 40000 - cumulCeliapp)) : 0;
          if (k % 12 === 0) cumulCeliapp += cCeliapp;
          celiapp = celiapp * (1 + rm) + cCeliapp;
          for (const ob of objectifs) { if (k < ob.mois) ob.s += ob.mensuel; if (ob.depenser && k + 1 === ob.mois) ob.s = 0; }
          if (o.societe) soc = soc * (1 + rmSoc) + Math.max(0, o.societe.retenuAnnee(a - 1)) / 12;
        }
        for (const v of autos) {
          v.valeurCourante *= 1 - v.depreciation / 100; v.age++;
          if (remplacement && remplacement.ans > 0 && v.age >= remplacement.ans && a < ans + 1) {
            const prix = remplacement.prix * Math.pow(1 + inflation, a);
            // La vieille auto est échangée à sa valeur ; la différence sort de l'épargne.
            const cout = prix - v.valeurCourante;
            if (v.conjointe) conj -= cout; else celi -= cout;
            v.valeurCourante = prix; v.age = 0; v.achats = (v.achats || 0) + 1;
          }
        }
      }
      const soldes = soldesAu(a);
      // Argent en attente d'être versé sur l'hypothèque (plafond de remboursement anticipé atteint).
      const attente = a > 0 && simulation.mois[a * 12 - 1] ? simulation.mois[a * 12 - 1].reserve || 0 : 0;
      let hypMoi = 0, hypMenage = 0, autresMoi = 0, autresMenage = 0;
      o.dettes.forEach((d, i) => {
        const part = (d.partMoi ?? 100) / 100;
        if (d.type === "hypotheque") { hypMenage += soldes[i]; hypMoi += soldes[i] * part; }
        else { autresMenage += soldes[i]; autresMoi += soldes[i] * part; }
      });
      const valeurMaison = o.maison.valeur * Math.pow(1 + o.maison.croissance / 100, a);
      const maisonMoi = valeurMaison * o.maison.part / 100;
      const maisonMenage = valeurMaison * (o.maison.partMenage ?? o.maison.part) / 100;
      const vMoi = autos.filter(v => !v.conjointe).reduce((s, v) => s + v.valeurCourante, 0);
      const vMenage = autos.reduce((s, v) => s + v.valeurCourante, 0);
      const objectifsSolde = objectifs.reduce((t, ob) => t + ob.s, 0);
      const valeurActif = x => x.valeur * Math.pow(1 + (x.croissance || 0) / 100, a);
      const actifsMoi = autresActifs.reduce((t, x) => t + valeurActif(x) * (x.part ?? 100) / 100, 0);
      const actifsMenage = autresActifs.reduce((t, x) => t + valeurActif(x) * (x.partMenage ?? x.part ?? 100) / 100, 0);
      const placements = reer + celi + celiapp + encaisse + attente + objectifsSolde;
      const moi = maisonMoi - hypMoi + vMoi + placements + soc + actifsMoi - autresMoi;
      const menage = maisonMenage - hypMenage + vMenage + placements + conj + soc + actifsMenage - autresMenage;
      res.push({ annee: o.anneeDepart + a, moi, menage, valeurMaison, maisonMoi, maisonMenage, hypMoi, hypMenage,
        equiteMoi: maisonMoi - hypMoi, equiteMenage: maisonMenage - hypMenage, autresMoi, autresMenage,
        voitureMoi: vMoi, voitureMenage: vMenage, reer, celi, celiapp, encaisse, attente, objectifs: objectifsSolde, placements, societe: soc, conjointe: conj,
        autresActifsMoi: actifsMoi, autresActifsMenage: actifsMenage,
        hypotheque: hypMenage, dettes: hypMenage + autresMenage });
    }
    return res;
  }

  const Calc = { P2026, VISITES, PRISE_EN_CHARGE, TARIFS_DEFAUT, TARIFS_LIEU, MONTANTS_LIEU, RAMQ, PCT_AU_DELA, lieuTarifs, montantsLieu, montantsVolume, tauxPolyvalence, SEUILS_POLYVALENCE, ACTIVITES_POLYVALENTES, tarifVisite, revenuGmfu, joursActivite, revenuActivite, impotParticulier, impotSalarie, transfertsConjoints, prestationsFamille, primeMedicaments, tauxMarginal,
    remboursementReer, impotDividendes, impotSociete, comparerSociete, simulerDettes, tauxReel, tauxMensuel, moisRestants, paiementPour, projeterReee, projeterValeurNette };
  if (typeof module !== "undefined" && module.exports) module.exports = Calc;
  else racine.Calc = Calc;
})(typeof window !== "undefined" ? window : globalThis);
