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
    // Crédit du Québec pour frais de scolarité : 8 % (au fédéral, le taux de base, sur le montant des frais).
    scolariteQuebec: 0.08,
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
    /* Cotisation au régime public d'assurance médicaments : maximum de 789 $ par adulte du 1er juillet 2026
       au 30 juin 2027 (RAMQ, tarifs en vigueur, consulté le 31 octobre 2026,
       https://www.ramq.gouv.qc.ca/fr/citoyens/assurance-medicaments/tarifs-vigueur). L'année d'avant, 766 $.
       Déductions de 2025 indexées de 2,05 %. */
    medicaments: { max: 789, deductions: { seul: 20298, mono1: 32901, mono2: 37207, couple0: 32901, couple1: 37207, couple2: 41187 },
      seuil: 5000, tauxCouple: [0.0393, 0.0589], tauxSeul: [0.0784, 0.1176] },
    /* Cotisation des particuliers au Fonds des services de santé, sur les revenus autres que d'emploi : 1 % au-delà
       de 18 500 $, jusqu'à 150 $ ; 150 $ jusqu'à 64 355 $ ; puis 1 % de plus, au plus 1 000 $ (Paramètres du régime
       d'imposition des particuliers pour l'année d'imposition 2026, ministère des Finances, novembre 2025). */
    fss: { seuil1: 18500, seuil2: 64355, taux: 0.01, palier: 150, max: 1000 },
    /* Dividendes non déterminés : majoration de 15 %, crédits de 9,0301 % (fédéral) et de 3,42 % (Québec) du montant
       majoré ; au Québec, 2,69 % après le 31 décembre 2026 (bulletin d'information 2026-3 du ministère des Finances). */
    dividendes: { majoration: 0.15, creditFederal: 0.090301, creditQuebec: 0.0342, creditQuebecDes2027: 0.0269 },
    // Normes d'hypothèses de projection 2026 (Institut de planification financière et FP Canada), avant frais.
    // Prudent et optimiste : le rendement réaliste, moins ou plus 1,5 point.
    normes: { revenuFixe: 3.2, actions: { canadiennes: 6.3, americaines: 6.4, internationales: 6.6 }, ecartScenarios: 1.5 },
    // Frais de garde d'enfants (16 ans ou moins). Québec : crédit remboursable, taux selon le revenu familial
    // (paramètres 2026, tableau 5), frais plafonnés par enfant. Fédéral : déduction plafonnée par enfant et
    // aux 2/3 du revenu gagné de celui qui la demande.
    garde: {
      quebec: { moins7: 12525, autres: 6305, taux: [[25305, 0.78], [44620, 0.75], [46270, 0.74], [47935, 0.73], [49565, 0.72], [51225, 0.71], [122290, 0.70], [Infinity, 0.67]] },
      federal: { moins7: 8000, autres: 5000, partRevenuGagne: 2 / 3 },
    },
  };

  /* ---------- Paramètres 2027, provisoires ----------
     Montants de 2026 indexés selon la formule officielle : moyenne de l'indice des prix à la consommation
     d'octobre 2025 à septembre 2026, sur celle de l'année d'avant (Statistique Canada, tableau 18-10-0004-01,
     consulté le 28 octobre 2026). Fédéral : 2,6 % (Canada, ensemble, facteur arrondi au millième, montants au
     dollar). Québec : 3,15 % (Québec, ensemble ; la même formule redonne 2,85 % pour 2025 et 2,05 % pour 2026 ;
     paliers et montants de garde au multiple de 5 $, autres montants au dollar). Assurance-emploi : maximum
     assurable de 70 800 $ et taux du Québec de 1,29 % (1,29 $ par 100 $, cotisation maximale de l'employé
     913,32 $ ; Commission de l'assurance-emploi du Canada, taux de 2027, consulté le 31 octobre 2026,
     https://www.canada.ca/fr/emploi-developpement-social/programmes/assurance-emploi/ae-liste/rapports/cotisation/taux2027.html).
     Crédit québécois pour dividendes non déterminés : 2,69 %.
     Ce qui ne suit pas cet indice reste à 2026 en attendant : RRQ, RQAP, prime d'assurance médicaments,
     Allocation canadienne pour enfants (indexée en juillet). Tout sera remplacé par les montants officiels. */
  const INDEX_2027 = { federal: 0.026, quebec: 0.0315 };
  const P2027 = (() => {
    const p = structuredClone(P2026), f = 1 + INDEX_2027.federal, q = 1 + INDEX_2027.quebec;
    const dollar = (v, k) => v === Infinity ? v : Math.round(v * k), cinq = (v, k) => v === Infinity ? v : Math.round(v * k / 5) * 5;
    p.federal.tranches = p.federal.tranches.map(([seuil, taux]) => [dollar(seuil, f), taux]);
    p.federal.bpaMax = dollar(p.federal.bpaMax, f); p.federal.bpaMin = dollar(p.federal.bpaMin, f);
    p.montantEmploi = dollar(p.montantEmploi, f);
    p.quebec.tranches = p.quebec.tranches.map(([seuil, taux]) => [cinq(seuil, q), taux]);
    p.quebec.montantBase = dollar(p.quebec.montantBase, q);
    p.deductionTravailleur.max = cinq(p.deductionTravailleur.max, q);
    p.fss.seuil2 = cinq(p.fss.seuil2, q);
    for (const k of ["max", "min", "seuilCouple", "seuilMono", "monoMax", "monoMin", "fournitures"]) p.allocationFamille[k] = dollar(p.allocationFamille[k], q);
    for (const k of Object.keys(p.medicaments.deductions)) p.medicaments.deductions[k] = dollar(p.medicaments.deductions[k], q);
    p.garde.quebec.moins7 = cinq(p.garde.quebec.moins7, q); p.garde.quebec.autres = cinq(p.garde.quebec.autres, q);
    p.garde.quebec.taux = p.garde.quebec.taux.map(([seuil, taux]) => [cinq(seuil, q), taux]);
    p.ae = { max: 70800, taux: 0.0129 };
    p.dividendes.creditQuebec = p.dividendes.creditQuebecDes2027;
    return Object.assign(p, { annee: 2027, provisoire: true, index: INDEX_2027 });
  })();
  P2026.annee = 2026; P2026.provisoire = false;
  // Paramètres de l'année d'imposition (2026 avant, 2027 ensuite) : les calculs plus bas s'en servent.
  const PARAMETRES = { 2026: P2026, 2027: P2027 };
  const parametres = annee => PARAMETRES[Math.min(2027, Math.max(2026, Math.floor(+annee) || 2026))];
  let PAR = P2026;
  function utiliserAnnee(annee) { PAR = parametres(annee); return PAR; }
  // Un calcul avec les paramètres d'une autre année (la vérification officielle reste en 2026).
  function avecAnnee(annee, f) { const avant = PAR; PAR = parametres(annee); try { return f(); } finally { PAR = avant; } }

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
     diem [résident, externe], liste 1 (régions régulières) ou liste 2 (régions du par. 5.03).
     Payés au taux horaire (et aux honoraires fixes), depuis le 1er octobre 2019 : forfait de responsabilité
     à chaque examen d'un patient vulnérable inscrit (EP 40, par. 6.02 B, code 15169), supplément à l'examen
     périodique d'un enfant de 0 à 5 ans (par. 8.01, code 08877) et au suivi de grossesse (par. 7.02 B, codes
     15144 et 15145). À l'acte et au mixte, ils sont compris dans le tarif des visites (tableau-synthèse des
     visites, note). ---------- */
  const MONTANTS_LIEU = {
    cabinet: { forfaitInscription: 11.85, forfaitVulnerable: 62.50, forfaitTresVulnerable: 125,
      suppNonVulnerable: 23.55, suppVulnerableHorsGuichet: 72.50, suppVulnerableGuichet: 155.35, suppTresVulnerable: 310.65,
      forfaitResponsabilite: 10.60, suppExamenEnfant: 17.05, suppSuiviGrossesse: 11.40, suppGrossessePremierTrimestre: 47.40,
      perDiem: { 1: [55.35, 66.45], 2: [86.95, 98.00] } },
    etablissement: { forfaitInscription: 8.95, forfaitVulnerable: 47, forfaitTresVulnerable: 94,
      suppNonVulnerable: 19.55, suppVulnerableHorsGuichet: 60.15, suppVulnerableGuichet: 128.90, suppTresVulnerable: 257.80,
      forfaitResponsabilite: 8.25, suppExamenEnfant: 13.35, suppSuiviGrossesse: 8.95, suppGrossessePremierTrimestre: 35.60,
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
  // Garde sur place au-delà du plafond annuel : 94 % du tarif, au plus 528 heures (annexe XIV, par. 5.03 et 5.05).
  const PCT_GARDE = 94, GARDE_MAX_94 = 528;
  // Supervision en GMF-U : au plus 5 h l'après-midi (annexe XXIII, GMF-U, point 3.1 ii), code 42097).
  const SUPERVISION_MAX_APRES_MIDI = 5;
  // Visites de suivi par grossesse, pour estimer les grossesses prises en charge quand leur nombre n'est pas inscrit.
  const VISITES_PAR_GROSSESSE = 10;
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

  // Part d'un type de visite dans la répartition saisie (ramenée à 100 %).
  function partVisite(mix, cle) {
    const total = VISITES.reduce((t, v) => t + Math.max(0, +mix[v.cle] || 0), 0);
    return total > 0 ? Math.max(0, +mix[cle] || 0) / total : 0;
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
     15 000 $ à 1 000 et plus), où certaines inscriptions comptent en double (par. 4.16 : patients
     A, B et C du guichet et de la lettre d'entente no 321 des douze derniers mois, vulnérables
     inscrits dans les douze mois après une attribution du guichet, puis, dès 500 inscrits, les
     vulnérables au-delà de 40 % des inscriptions) ; la personne en inscrit le nombre. Suppléments
     par patient au-delà des seuils (par. 15.01, depuis le 1er janvier 2019), sur le nombre brut,
     selon le taux d'assiduité (par. 15.03 et 15.05) : 100 % à 80 % ou plus, 75 % de 75 à 79 %,
     50 % de 70 à 74 %, rien en dessous. */
  const VOLUME_INSCRITS = [[500, 0], [750, 5.23], [1000, 10.46], [1500, 15.69], [Infinity, 20.92]];
  const VOLUME_VULNERABLES = [[200, 0], [300, 5.23], [500, 10.46], [Infinity, 15.69]];
  // Part des suppléments selon le taux d'assiduité (« 80 », « 75 », « 70 », « 0 ») ; vrai ou faux : l'ancienne case.
  const partAssiduite = a => a === true || a === undefined || a === null ? 1 : a === false ? 0 : +a >= 80 ? 1 : +a >= 75 ? 0.75 : +a >= 70 ? 0.5 : 0;
  function montantsVolume(inscrits, vulnerables, assiduite = true, enDouble = 0) {
    const n = Math.round(inscrits), nv = Math.round(vulnerables), pondere = n + Math.max(0, Math.round(+enDouble || 0));
    const montant = pondere >= 1000 ? 15000 : pondere >= 750 ? 7500 : 0;
    const supplements = partAssiduite(assiduite) * (parTranches(n, VOLUME_INSCRITS) + parTranches(nv, VOLUME_VULNERABLES));
    return { montant, supplements, total: montant + supplements, pondere };
  }
  /* Pratique polyvalente (EP 40, par. 16.00) : majoration de la rémunération des activités en
     établissement (par. 16.01 : urgence, malades admis, CHSLD, obstétrique, soins palliatifs, centre de
     détention, centre jeunesse, centre de réadaptation ; l'évacuation aéromédicale compte comme
     l'urgence ; aussi les constats de décès et le soutien préhospitalier, et la santé publique avec
     la garde en disponibilité rémunérée), selon les inscrits
     actifs au 31 décembre : 2,5 %, 5 % ou 10 %, avec des seuils plus bas pendant les quatre premières
     années de pratique (par. 16.04). Au-delà de 245 patients vulnérables, chacun compte pour 2,5 (par. 16.03). */
  const SEUILS_POLYVALENCE = { 1: [100, 200, 300], 2: [250, 400, 600], 3: [400, 600, 900], 4: [550, 800, 1200], 5: [700, 1000, 1500] };
  const ACTIVITES_POLYVALENTES = ["urgence", "hospitalisation", "obstetrique", "palliatifs", "chsld", "detention", "jeunesse", "readaptation", "prehospitalier", "santePublique"];
  function tauxPolyvalence(inscrits, vulnerables, anneePratique) {
    const n = Math.round(inscrits + Math.max(0, vulnerables - 245) * 1.5);
    const [a, b, c] = SEUILS_POLYVALENCE[borne(Math.floor(+anneePratique || 5), 1, 5)];
    return n >= c ? 10 : n >= b ? 5 : n >= a ? 2.5 : 0;
  }
  /* Compensation des frais de cabinet, en cabinet seulement (EP 40) : par jour de pratique, 32,40 $ si l'on voit
     au moins 6 patients inscrits, 64,80 $ à 12 ou plus, au plus 64,80 $ par jour civil (par. 14.01, codes 19928 et
     19929) ; au sans rendez-vous, 10 et 20 patients. Les demi-journées de rendez-vous vont par deux dans une journée.
     Une demi-journée de sans rendez-vous compte pour une journée, sauf si elle tombe le même jour qu'une demi-journée
     de rendez-vous (r.srvMemeJour) : les deux demi-journées partagent alors le plafond de 64,80 $. DMÉ, dès
     150 inscrits ou, la première année du permis, sans égard au nombre (par. 17.01, taxes incluses) : licences,
     459,90 $ par trimestre (19978) ; hors GMF, équipements, 287,45 $ par trimestre en plus (19976), et le lien
     Internet et le commutateur, 700,35 $ par trimestre (19977), qu'un seul médecin du cabinet réclame. */
  const parJourCabinet = (n, [haut, bas]) => n >= haut ? 64.80 : n >= bas ? 32.40 : 0;
  function compensationCabinet(r, semaines, demiJournees, inscrits) {
    const p = Math.max(0, r.patientsParDJ || 0), srv = Math.max(0, r.demiJourneesSRV || 0), pSrv = Math.max(0, r.patientsSRV || 0);
    // Même jour : chaque demi-journée de SRV prend la place d'une demi-journée de rendez-vous dans une journée.
    const mixtes = r.srvMemeJour ? Math.min(Math.floor(srv), Math.floor(demiJournees)) : 0;
    const rdv = demiJournees - mixtes, jours = Math.floor(rdv / 2), seule = rdv - 2 * jours >= 1;
    const parSemaine = jours * parJourCabinet(2 * p, [12, 6]) + (seule ? parJourCabinet(p, [12, 6]) : 0) + (srv - mixtes) * parJourCabinet(pSrv, [20, 10])
      + mixtes * Math.min(64.80, parJourCabinet(p, [12, 6]) + parJourCabinet(pSrv, [20, 10]));
    const dmeOk = inscrits >= 150 || r.annee === "premiere";
    const jour = Math.max(0, semaines) * parSemaine;
    const dme = dmeOk ? 4 * (459.90 + (r.membreGmf ? 0 : 287.45 + (r.dmeInternet ? 700.35 : 0))) : 0;
    return { jour, dme, total: jour + dme };
  }
  function revenuGmfu(r) {
    const W = Math.max(0, r.semaines), N = r.demiJournees, H = r.heuresParDJ, TF = tarifsDe(r);
    // Montants de la RAMQ : ceux saisis, sinon ceux de la brochure pour le lieu (cabinet ou établissement).
    const D = { ...RAMQ, ...montantsLieu(lieuTarifs(r), r.listeEnseignement) }, m = k => r[k] ?? D[k];
    const SRV = Math.max(0, r.demiJourneesSRV || 0), patientsSRV = Math.max(0, r.patientsSRV || 0);
    const T = Math.min(r.enseignement, N), C = Math.max(N - T, 0);
    // Supervision payée au plus 3,5 h l'avant-midi et le soir, 5 h l'après-midi (annexe XXIII, GMF-U, point 3.1 ii) :
    // codes 42096 de 8 h à 12 h, 42097 de 12 h à 18 h, 42098 de 18 h à 24 h). Heures par demi-journée d'enseignement.
    const Tpm = Math.min(T, Math.max(0, +r.enseignementApresMidi || 0));
    const heuresSup = T > 0 ? ((T - Tpm) * Math.min(H, m("supervisionMaxH")) + Tpm * Math.min(H, SUPERVISION_MAX_APRES_MIDI)) / T : 0;
    // Clientèle : non vulnérables, vulnérables et très vulnérables (parts des inscrits).
    const vt = borne((r.partTresVulnerable || 0) / 100, 0, 1), v = borne(r.partVulnerable / 100, 0, 1 - vt), nv = 1 - v - vt;
    const premiere = r.annee === "premiere";
    // Apprenants en GMF-U : visites des résidents et des externes par demi-journée d'enseignement.
    // À l'acte, le superviseur les facture ; au mixte, il choisit pour la demi-journée ces visites ou
    // l'intervention de supervision (annexe XXIII, B-2, par. 3.1) ; au taux horaire, ses heures sont payées.
    // Avec l'intervention de supervision, les patients que le superviseur voit lui-même pendant le bloc ne se
    // facturent pas (point 3.1 ii), conditions 2 et 4) : seuls ceux vus avant ou après le bloc.
    const resid = Math.max(0, r.residents || 0), ext = Math.max(0, r.externes || 0);
    const visitesApprenants = r.supervisionFacturation === "visites", pendant = Math.max(0, r.patientsPendantSupervision || 0);
    const apprenants = resid * (r.patientsParResident ?? 4.5) + ext * (r.patientsParExterne ?? 2.5);
    // Sans rendez-vous : part des visites ponctuelles complexes.
    const pc = borne((r.pctSrvComplexe || 0) / 100, 0, 1);
    const tarifSrv = palier => (1 - pc) * TF.srvMineure[palier] + pc * TF.srvComplexe[palier];
    // Majoration selon le territoire (annexes XII et XII-A) : sur les visites, les heures, la supervision,
    // les demi-per diem, les activités, et les forfaits d'inscription et annuels (EP 40, par. 4.02 et 6.01 C) ;
    // pas sur les suppléments à l'inscription ni sur les montants liés au volume.
    const maj = 1 + (r.majorationPct || 0) / 100;

    // Patients transférés, déjà inscrits ailleurs : changement de médecin (aucun supplément), ou transfert en bloc de la
    // lettre d'entente no 304 (suppléments du guichet, 19957, 19959 et 19960, à la première visite, art. 4 d)). Dans les
    // deux cas, le forfait d'inscription et le forfait annuel d'un vulnérable se partagent en mois entiers, le mois du
    // transfert restant au premier médecin (EP 40, par. 4.06 et 6.01 F ; lettre no 304, art. 4 f)).
    const transferes = premiere ? Math.max(0, r.nouveauxTransferes || 0) : 0, enBloc = r.typeTransfert === "bloc";
    const nouveaux = premiere ? r.nouveauxGuichet + r.nouveauxSansMedecin + transferes : 0;
    // Année type : de nouveaux patients chaque année, qui remplacent les départs (la clientèle reste stable).
    // Ils donnent leurs suppléments d'inscription et une visite de prise en charge.
    const anGuichet = premiere ? 0 : Math.max(0, +r.nouveauxAnGuichet || 0), anSansMedecin = premiere ? 0 : Math.max(0, +r.nouveauxAnSansMedecin || 0);
    const remplacements = (anGuichet + anSansMedecin) / Math.max(1, W);
    const etalement = Math.max(1, Math.min(W, r.semainesArrivee || W));
    let inscrits = premiere ? r.inscritsDebut : r.inscritsDebut + r.nouveauxGuichet + r.nouveauxSansMedecin + r.nouveauxTransferes;
    const inscritsDepart = inscrits;
    // Forfait annuel selon les catégories de problèmes de santé (EP 40, par. 6.01) : une catégorie à 100 %, deux à 150 %
    // (groupe II), trois ou plus, ou deux dont la santé mentale ou la déficience intellectuelle, à 200 % (groupes III et IV).
    const g2 = borne((r.partGroupe2 || 0) / 100, 0, 1), g34 = borne((r.partGroupe34 || 0) / 100, 0, 1 - g2);
    const forfaitAnnuel = v * m("forfaitVulnerable") * (1 + 0.5 * g2 + g34) + vt * m("forfaitTresVulnerable");

    let visitesMixte = 0, visitesAppr = 0, visitesPendant = 0, visitesSrv = 0, nbVisites = 0, nbPriseEnCharge = 0, forfaitVulnNouveaux = 0, semainesPalierHaut = 0;
    let visitesPropres = 0, partInscriptionTransferes = 0;
    for (let k = 0; k < W; k++) {
      const palier = inscrits >= 499.999 ? 1 : 0;
      if (palier) semainesPalierHaut++;
      const arrivees = k < etalement ? nouveaux / etalement : 0;
      const visitesSem = C * r.patientsParDJ;
      const pec = Math.min(arrivees + remplacements, visitesSem);
      const tarifPec = nv * TF.pecNonVuln[palier] + (v + vt) * TF.pecVuln[palier];
      const tv = tarifVisite(r.mix, palier, TF);
      visitesMixte += pec * tarifPec + (visitesSem - pec) * tv;
      visitesPendant += T * pendant * tv;
      visitesAppr += T * apprenants * tv;
      visitesSrv += SRV * patientsSRV * tarifSrv(palier);
      nbVisites += visitesSem + T * pendant + T * apprenants + SRV * patientsSRV;
      nbPriseEnCharge += pec;
      visitesPropres += visitesSem - pec + T * pendant;
      // Forfait vulnérable : payé à partir du mois d'inscription (EP 40, par. 6.01) ; pour un patient transféré,
      // à partir du mois suivant.
      const mois = Math.floor((k / W) * 12), arrT = k < etalement ? transferes / etalement : 0;
      forfaitVulnNouveaux += (arrivees - arrT) * forfaitAnnuel * (12 - mois) / 12 + arrT * forfaitAnnuel * Math.max(0, 11 - mois) / 12;
      partInscriptionTransferes += arrT * Math.max(0, 11 - mois) / 12;
      inscrits += arrivees;
    }
    const inscritsFin = inscrits, vulnerablesFin = inscritsFin * (v + vt);

    // Forfaits, suppléments et montants liés au volume : identiques dans tous les modes.
    // Payé en entier pour une inscription nouvelle (EP 40, par. 4.08) ; au prorata des mois pour un transfert.
    const forfaitInscription = (inscritsFin - transferes + partInscriptionTransferes) * m("forfaitInscription") * maj;
    const forfaitVulnerable = (inscritsDepart * forfaitAnnuel + forfaitVulnNouveaux) * maj;
    // Patient sans médecin de famille : non vulnérable (19957), vulnérable hors guichet (19958),
    // vulnérable du guichet (19959), très vulnérable du guichet (19960).
    const suppNouveaux = (guichet, sansMedecin) => guichet * (nv * m("suppNonVulnerable") + v * m("suppVulnerableGuichet") + vt * m("suppTresVulnerable"))
      + sansMedecin * (nv * m("suppNonVulnerable") + (v + vt) * m("suppVulnerableHorsGuichet"));
    let supplements = premiere ? suppNouveaux(r.nouveauxGuichet + (enBloc ? transferes : 0), r.nouveauxSansMedecin) : suppNouveaux(anGuichet, anSansMedecin);
    // Prime d'inscription individuelle d'une entente ponctuelle, par nouveau patient de la première année (0 si aucune).
    if (premiere) supplements += (r.nouveauxGuichet + r.nouveauxSansMedecin) * (r.primeInscription || 0);
    const detailVolume = montantsVolume(inscritsFin, vulnerablesFin, r.assiduite ?? r.assiduite80, r.inscriptionsEnDouble), volume = detailVolume.total;
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
    // Compensation des frais de cabinet : calculée selon l'EP 40, ou le montant inscrit.
    const detailCompensation = lieuTarifs(r) === "cabinet" ? compensationCabinet(r, W, C, inscritsFin) : { jour: 0, dme: 0, total: 0 };
    const compensation = r.compensationMode === "manuel" ? Math.max(0, r.compensationCabinet || 0) : detailCompensation.total;
    const commun = forfaitInscription + forfaitVulnerable + forfaitGmf + supplements + volume + perDiem + compensation + activites + polyvalence + autres;
    const base = { perDiem, forfaitInscription, forfaitVulnerable, forfaitGmf, supplements, volume, compensation, activites, polyvalence, autres };

    // Taux horaire (annexe XIV) : à 100 % jusqu'au plafond annuel (par. 5.02). Les heures en clinique remplissent
    // d'abord le plafond ; la garde sur place faite en plus de ces heures le complète, puis celle faite en excédent
    // est payée à 94 %, au plus 528 h (par. 5.03 et 5.05) ; les autres heures au-delà, à 71,8 % (par. 5.04).
    const heures = W * (N + SRV) * H, plafondHeures = Math.max(0, m("heuresMax100"));
    const garde = Math.max(0, +r.heuresGardeSurPlace || 0), heuresHoraire = heures + garde;
    const heuresAuDela = Math.max(0, heuresHoraire - plafondHeures);
    const gardeExcedent = Math.max(0, garde - Math.max(0, plafondHeures - heures));
    const gardeAuDela = Math.min(GARDE_MAX_94, gardeExcedent), autresAuDela = heuresAuDela - gardeAuDela;
    const perteHeures = (gardeAuDela * (1 - PCT_GARDE / 100) + autresAuDela * (1 - PCT_AU_DELA / 100)) * m("tarifHoraire") * maj;
    // En plus des heures : forfait de responsabilité à chaque examen d'un patient vulnérable inscrit (visites de
    // suivi et périodiques des patients vulnérables, prises en charge de patients vulnérables), supplément à chaque
    // examen périodique d'un enfant de 0 à 5 ans et à chaque suivi de grossesse (EP 40, par. 6.02 B, 8.01, 7.02 B),
    // et une fois par grossesse prise en charge au premier trimestre (par. 7.02 A). Nombre de grossesses : celui
    // inscrit, sinon les suivis de grossesse divisés par VISITES_PAR_GROSSESSE.
    const examens = {
      vulnerables: visitesPropres * (partVisite(r.mix, "suiviV") + partVisite(r.mix, "perioV")) + nbPriseEnCharge * (v + vt),
      enfants: visitesPropres * partVisite(r.mix, "pedia"),
      grossesse: visitesPropres * partVisite(r.mix, "gross"),
    };
    examens.priseEnChargeGrossesse = r.grossessesAn != null && r.grossessesAn !== "" ? Math.max(0, +r.grossessesAn || 0) : examens.grossesse / VISITES_PAR_GROSSESSE;
    const responsabilite = (examens.vulnerables * m("forfaitResponsabilite") + examens.enfants * m("suppExamenEnfant")
      + examens.grossesse * m("suppSuiviGrossesse") + examens.priseEnChargeGrossesse * m("suppGrossessePremierTrimestre")) * maj;
    const horaire = { heures: heuresHoraire * m("tarifHoraire") * maj - perteHeures, responsabilite, ...base };
    horaire.total = horaire.heures + horaire.responsabilite + commun;
    // Mixte : forfait horaire, part du tarif des visites et, en GMF-U, l'intervention de supervision
    // pour la demi-journée d'enseignement, ou les visites des apprenants.
    const mixte = {
      forfaitHoraire: heures * m("forfaitHoraireMixte") * maj,
      visites: (visitesMixte + visitesSrv + (visitesApprenants ? visitesAppr + visitesPendant : 0)) * maj * m("pctMixte") / 100,
      supervision: visitesApprenants ? 0 : W * T * heuresSup * m("acteSupervision") * maj * m("pctSupervision") / 100,
      ...base,
    };
    mixte.total = mixte.forfaitHoraire + mixte.visites + mixte.supervision + commun;
    // À l'acte : chaque visite au tarif de l'entente (100 % par défaut), celles des apprenants comprises
    // (l'intervention de supervision n'existe qu'au mixte), sans forfait horaire.
    const pctActe = r.pctActe ?? 100;
    const acte = { visites: (visitesMixte + visitesSrv + visitesAppr + visitesPendant) * maj * pctActe / 100, ...base };
    acte.total = acte.visites + commun;
    // Frais de cabinet (loyer, personnel, équipement) remis à la clinique : un pourcentage
    // de la facturation RAMQ de la clinique (sans la compensation des frais de cabinet, les
    // activités en établissement ni les autres revenus) et un montant fixe. À l'acte seulement,
    // sauf si la clinique les exige aussi au taux horaire et au mixte.
    const frais = (x, applique) => !applique ? 0 : Math.max(0,
      (x.total - compensation - activites - polyvalence - autres) * (r.fraisCabinetPct || 0) / 100 + (r.fraisCabinetMois || 0) * 12);
    horaire.fraisCabinet = frais(horaire, r.fraisCabinetTousModes);
    mixte.fraisCabinet = frais(mixte, r.fraisCabinetTousModes);
    acte.fraisCabinet = frais(acte, true);

    // Seuils d'une demi-journée de rendez-vous, au palier de fin d'année. Les forfaits communs
    // (inscription, volume, GMF) sont les mêmes dans les trois modes : ils ne déplacent pas le seuil.
    const palierFin = inscritsFin >= 499.999 ? 1 : 0;
    const tarifMoyenSeuil = tarifVisite(r.mix, palierFin, TF);
    const parVisite = tarifMoyenSeuil * maj * m("pctMixte") / 100;
    // Sans le forfait de responsabilité : le mixte égale l'heure (à 100 % du tarif horaire).
    const seuil = parVisite > 0 ? (m("tarifHoraire") - m("forfaitHoraireMixte")) * maj * H / parVisite : null;
    const parVisiteActe = tarifMoyenSeuil * maj * pctActe / 100;
    // Au seuil, chaque visite à l'acte, après le pourcentage remis à la clinique, égale l'heure au taux horaire.
    const fA = Math.max(0, Math.min(100, +r.fraisCabinetPct || 0)) / 100;
    const fAutres = r.fraisCabinetTousModes ? fA : 0;
    const netVisite = parVisiteActe * (1 - fA) / (r.fraisCabinetTousModes ? 1 - fA : 1);
    const seuilActe = netVisite > 0 ? m("tarifHoraire") * maj * H / netVisite : null;
    // Forfait de responsabilité et suppléments d'examen : au taux horaire seulement
    // (EP 40, par. 6.02 B, 8.01 et 7.02 B). Le supplément unique du premier trimestre n'est pas ici :
    // il ne suit pas le nombre de patients de la demi-journée.
    const respParPatient = ((partVisite(r.mix, "suiviV") + partVisite(r.mix, "perioV")) * m("forfaitResponsabilite")
      + partVisite(r.mix, "pedia") * m("suppExamenEnfant") + partVisite(r.mix, "gross") * m("suppSuiviGrossesse")) * maj;
    // Montant fixe remis à la clinique, étalé sur les demi-journées de rendez-vous (pas l'enseignement).
    const djAn = W * C;
    const fixeDJ = djAn > 0 ? Math.max(0, +r.fraisCabinetMois || 0) * 12 / djAn : 0;
    const fixeHoraire = r.fraisCabinetTousModes ? fixeDJ : 0, fixeActe = fixeDJ;
    // Ce que paie la RAMQ pour la demi-journée, avant les frais de cabinet.
    // Le pourcentage remis à la clinique ne doit pas entrer ici : à 30 % sur l'acte seulement,
    // il ne reste que quelques dollars par visite au-dessus du mixte, et le forfait horaire
    // ne se couvre qu'autour de 80 à 90 patients, ce qu'une demi-journée ne permet pas.
    const partHoraire = respParPatient, partMixte = parVisite, partActe = parVisiteActe;
    const baseHoraire = H * m("tarifHoraire") * maj, baseMixte = H * m("forfaitHoraireMixte") * maj;
    const gainMixte = partMixte - partHoraire;
    const seuilMixte = gainMixte > 1e-9 ? (baseHoraire - baseMixte) / gainMixte : null;
    const gainActe = partActe - partMixte;
    const seuilActeMixte = gainActe > 1e-9 ? baseMixte / gainActe : null;
    // Même comparaison, une fois les frais qui ne touchent que l'acte retirés. Sert à dire
    // si l'acte rattrape encore le mixte sur une demi-journée, pas à afficher « dès 89 ».
    const partActeNet = parVisiteActe * (1 - fA), partMixteNet = parVisite * (1 - fAutres);
    const baseMixteNet = baseMixte * (1 - fAutres) - fixeHoraire;
    const gainActeNet = partActeNet - partMixteNet;
    const seuilActeMixteApresFrais = gainActeNet > 1e-9 ? (baseMixteNet + fixeActe) / gainActeNet : null;
    const nClin = Math.max(0, +r.patientsParDJ || 0);
    const demiJourneeClinique = { horaire: baseHoraire + nClin * partHoraire, mixte: baseMixte + nClin * partMixte, acte: nClin * partActe };

    // Revenu moyen par patient, à 100 % du tarif, au palier de fin d'année : rendez-vous et sans rendez-vous.
    const tarifMoyenRdv = tarifVisite(r.mix, palierFin, TF) * maj, tarifMoyenSrv = tarifSrv(palierFin) * maj;
    // Hausse du tarif moyen d'une visite au palier de 500 inscrits.
    const t0 = tarifVisite(r.mix, 0, TF), gainPalier = t0 > 0 ? tarifVisite(r.mix, 1, TF) / t0 - 1 : 0;
    return { heures, garde, heuresHoraire, heuresAuDela, gardeAuDela, autresAuDela, plafondHeures, perteHeures, nbVisites, nbPriseEnCharge, inscritsDepart, inscritsFin, vulnerablesFin, semainesPalierHaut, gainPalier,
      patientsVus, forfaitGmfPossible, detailCompensation, activites, detailActivites, basePolyvalence, polyvalence, pctPolyvalence, anneePratique, detailVolume, examens,
      visitesApprenants: W * T * apprenants, heuresSupervision: heuresSup, tarifMoyenRdv, tarifMoyenSrv,
      horaire, mixte, acte, ecart: mixte.total - horaire.total, seuilPatients: seuil, seuilActe, seuilMixte, seuilActeMixte, seuilActeMixteApresFrais, demiJourneeClinique };
  }

  /* ============================================================
     COMPARER LES ACTES : ce que rapporte chaque acte selon le mode, l'intervention de supervision ou
     les visites des apprenants, une demi-journée de votre choix, et les formulaires de la CNESST.
     ============================================================ */
  /* Actes courants (manuel de la RAMQ, onglet B, voir TARIFS_LIEU). Au taux horaire, le temps passé est payé,
     plus le forfait de responsabilité (patient vulnérable inscrit) ou le supplément de l'examen (EP 40,
     par. 6.02 B, 8.01, 7.02 B). Durée : celle que la personne prévoit, pour comparer à l'heure (valeur de
     départ seulement, à ajuster). */
  const ACTES = [
    { cle: "suivi", nom: "Suivi", codes: ["15803", "15804"], duree: 15 },
    { cle: "suiviV", nom: "Suivi, patient vulnérable", codes: ["15823", "15824"], duree: 20, horaire: "forfaitResponsabilite" },
    { cle: "perioV", nom: "Périodique, patient vulnérable", codes: ["15819", "15820"], duree: 30, horaire: "forfaitResponsabilite" },
    { cle: "pedia", nom: "Périodique pédiatrique", codes: ["15813", "15814"], duree: 20, horaire: "suppExamenEnfant" },
    { cle: "gross", nom: "Suivi de grossesse", codes: ["15811", "15812"], duree: 15, horaire: "suppSuiviGrossesse" },
    { cle: "pecNonVuln", nom: "Prise en charge", codes: ["15801", "15802"], duree: 30 },
    { cle: "pecVuln", nom: "Prise en charge, patient vulnérable", codes: ["15821", "15822"], duree: 45, horaire: "forfaitResponsabilite" },
    { cle: "srvMineure", nom: "Sans rendez-vous, mineure", codes: ["15765", "15766"], duree: 10 },
    { cle: "srvComplexe", nom: "Sans rendez-vous, complexe", codes: ["15773", "15774"], duree: 15 },
  ];
  /* Formulaires de la CNESST et de l'IVAC (annexe XIII de l'Entente, en vigueur depuis le 1er avril 2025 ; manuel
     de la RAMQ consulté le 25 octobre 2026). Payés à 100 % du tarif dans tous les modes : à l'acte ; au mixte
     (annexe XXIII, par. 2.11) ; au taux horaire, à l'acte pour ces services, sans facturer d'heures pour ce temps.
     L'examen se facture à part, sauf le rapport d'évaluation médicale (09944). Sans majoration selon le territoire. */
  const CNESST = [
    { code: "09926", nom: "Attestation médicale", tarif: 27.57 },
    { code: "09927", nom: "Rapport sommaire de prise en charge", tarif: 26.96 },
    { code: "09928", nom: "Rapport d'évolution", tarif: 26.96 },
    { code: "09930", nom: "Rapport final", tarif: 31.86 },
    { code: "09929", nom: "Information médicale complémentaire écrite", tarif: 128.67 },
    { code: "09909", nom: "Rapport complémentaire", tarif: 159.31 },
    { code: "09907", nom: "Bilan médical", tarif: 165.43 },
    { code: "09908", nom: "Opinion avant consolidation : lien d'emploi", tarif: 140.93 },
    { code: "09922", nom: "Mesures de réadaptation avant consolidation", tarif: 61.27 },
    { code: "09971", nom: "Assignation temporaire d'un travail", tarif: 102.94 },
    { code: "09970", nom: "Retrait préventif de la travailleuse enceinte ou qui allaite", tarif: 85.78 },
    { code: "09944", nom: "Rapport d'évaluation médicale, examen compris", tarif: 520.81 },
    { code: "15795", nom: "IVAC : évaluation médicale", tarif: 27.57 },
    { code: "15796", nom: "IVAC : rapport médical", tarif: 26.96 },
    { code: "15797", nom: "IVAC : rapport final", tarif: 31.86 },
  ];
  // Montants d'un lieu, avec ceux que la personne a changés (o.montants), et la majoration du territoire.
  const baseActes = o => {
    const lieu = o.lieu === "cabinet" ? "cabinet" : "etablissement";
    return { lieu, palier: o.palier ? 1 : 0, T: { ...TARIFS_LIEU[lieu], ...(o.tarifs || {}) }, D: { ...RAMQ, ...montantsLieu(lieu, o.liste), ...(o.montants || {}) },
      maj: 1 + (+o.majorationPct || 0) / 100, pctActe: (o.pctActe ?? 100) / 100 };
  };
  // Chaque acte : à l'acte, sa part au mixte, ce qui s'ajoute au taux horaire ; et à l'heure, selon sa durée.
  function valeurActes(o = {}) {
    const { palier, T, D, maj, pctActe } = baseActes(o);
    return ACTES.map(a => {
      const tarif = (+T[a.cle][palier] || 0) * maj, duree = Math.max(1, +(o.durees || {})[a.cle] || a.duree), parHeure = 60 / duree;
      const enPlus = a.horaire ? (+D[a.horaire] || 0) * maj : 0, acte = tarif * pctActe, mixte = tarif * D.pctMixte / 100;
      return { ...a, code: a.codes[palier], tarif, duree, acte, mixte, horaireEnPlus: enPlus,
        heure: { acte: acte * parHeure, mixte: D.forfaitHoraireMixte * maj + mixte * parHeure, horaire: D.tarifHoraire * maj + enPlus * parHeure } };
    });
  }
  /* Une demi-journée d'enseignement au mixte, en GMF-U (annexe XXIII, B-2, par. 3.1) : l'intervention de supervision
     (au plus 3,5 h, 5 h l'après-midi ; un seul acte, quel que soit le nombre d'apprenants) ou les visites des
     apprenants, plus celles que le superviseur fait lui-même pendant le bloc. Le forfait horaire et le demi-per diem
     (EP 42) sont les mêmes dans les deux cas. Seuil : visites à partir desquelles les visites rapportent plus. */
  function supervisionOuVisites(o = {}) {
    const { D, maj } = baseActes(o);
    const H = Math.max(0, +o.heuresParDJ || 0), heures = Math.min(H, o.apresMidi ? SUPERVISION_MAX_APRES_MIDI : D.supervisionMaxH);
    const resid = Math.max(0, +o.residents || 0), ext = Math.max(0, +o.externes || 0);
    const nbVisites = resid * Math.max(0, o.patientsParResident ?? 4.5) + ext * Math.max(0, o.patientsParExterne ?? 2.5) + Math.max(0, +o.pendant || 0);
    const parVisite = Math.max(0, +o.tarifMoyen || 0) * maj * D.pctMixte / 100;
    const supervision = heures * D.acteSupervision * maj * D.pctSupervision / 100, visites = nbVisites * parVisite;
    return { heures, nbVisites, parVisite, supervision, visites, ecart: visites - supervision, meilleur: visites > supervision + 0.005 ? "visites" : "acte",
      seuil: parVisite > 0 ? supervision / parVisite : null, forfait: H * D.forfaitHoraireMixte * maj, perDiem: (resid * D.perDiemResident + ext * D.perDiemExterne) * maj };
  }
  // Une demi-journée de votre choix : les actes et les formulaires comptés, au taux horaire, au mixte et à l'acte,
  // avant et après les frais de cabinet (à l'acte ; aussi aux autres modes si la clinique les exige).
  function demiJourneeActes(o = {}) {
    const { D, maj, pctActe } = baseActes(o), actes = valeurActes(o), n = o.nombres || {}, H = Math.max(0, +o.heuresParDJ || 0);
    let tarifs = 0, enPlus = 0, patients = 0;
    for (const a of actes) { const k = Math.max(0, +n[a.cle] || 0); tarifs += k * a.tarif; enPlus += k * a.horaireEnPlus; patients += k; }
    const formulaires = CNESST.reduce((t, f) => t + Math.max(0, +n[f.code] || 0) * f.tarif, 0);
    const frais = Math.max(0, Math.min(100, +o.fraisCabinetPct || 0)) / 100;
    const mode = (brut, applique) => ({ brut, net: brut * (1 - (applique ? frais : 0)) });
    return { patients, formulaires, heures: H,
      horaire: mode(H * D.tarifHoraire * maj + enPlus + formulaires, o.fraisTousModes),
      mixte: mode(H * D.forfaitHoraireMixte * maj + tarifs * D.pctMixte / 100 + formulaires, o.fraisTousModes),
      acte: mode(tarifs * pctActe + formulaires, true) };
  }

  /* ============================================================
     IMPÔT 2026 : particulier (travailleur autonome)
     ============================================================ */
  function cotisationsAutonome(revenuNet) {
    const q = PAR.rrq;
    const assiette = borne(revenuNet - q.exemption, 0, q.mga - q.exemption);
    const base = assiette * q.base, supp1 = assiette * q.supp1;
    const supp2 = borne(Math.min(revenuNet, q.mgs) - q.mga, 0, q.mgs - q.mga) * q.supp2;
    const assurable = borne(revenuNet, 0, PAR.rqap.max);
    const rqap = assurable * PAR.rqap.autonome;
    return {
      rrq: base + supp1 + supp2, rqap,
      deduction: base / 2 + supp1 + supp2 + assurable * (PAR.rqap.autonome - PAR.rqap.salarie),
      creditFederal: base / 2 + assurable * PAR.rqap.salarie,
    };
  }

  // Cotisation au Fonds des services de santé sur les revenus autres que d'emploi (approximation).
  function fss(revenu) {
    const f = PAR.fss;
    return revenu <= f.seuil1 ? 0 : revenu <= f.seuil2 ? Math.min(f.palier, (revenu - f.seuil1) * f.taux) : Math.min(f.max, f.palier + (revenu - f.seuil2) * f.taux);
  }

  // Au Québec, crédit de 10 % des cotisations syndicales, sans les retirer du revenu imposable.
  // La page d'aide de la ligne 397 a renvoyé une erreur 404 le 31 octobre 2026 ; le taux est celui retenu par l'audit.
  const CREDIT_SYNDICAT_QC = 0.10;
  function impotsDeBase(imposableFed, imposableQc, creditsFedMontant, creditsQcMontant, creditsFedDirects, creditsQcDirects, personneACharge) {
    const f = PAR.federal, q = PAR.quebec;
    const bpa = imposableFed <= f.tranches[2][0] ? f.bpaMax
      : imposableFed >= f.tranches[3][0] ? f.bpaMin
      : f.bpaMax - (f.bpaMax - f.bpaMin) * (imposableFed - f.tranches[2][0]) / (f.tranches[3][0] - f.tranches[2][0]);
    // Personne à charge admissible : le même montant que le montant personnel de base, et le même écrêtement
    // (ARC, indexation 2026, 16 452 $ sous le seuil du taux de 29 %, consulté le 31 octobre 2026,
    // https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/foire-questions-particuliers/rajustement-montants-fonction-indexation-impot-particuliers-prestations.html).
    const montantPerso = bpa * (personneACharge ? 2 : 1);
    const fedBase = Math.max(0, parTranches(imposableFed, f.tranches) - (montantPerso + creditsFedMontant) * f.tauxCredit - creditsFedDirects);
    const fed = fedBase * (1 - f.abattementQc);
    const qc = Math.max(0, parTranches(imposableQc, q.tranches) - (q.montantBase + creditsQcMontant) * q.tauxCredit - creditsQcDirects);
    return { fed, qc };
  }

  const deductionTravailleur = revenuTravail => Math.min(PAR.deductionTravailleur.max, Math.max(0, revenuTravail) * PAR.deductionTravailleur.taux);

  /* Revenu de travail autonome (RAMQ), moins les dépenses et le REER.
     interetsEtudes : intérêts payés sur un prêt de l'aide financière aux études.
     Rend aussi le revenu net fédéral et québécois, qui servent aux prestations familiales. */
  // autresImposables : revenus imposables qui ne sont pas du travail (location nette, placements
  // hors REER et CELI) : sans RRQ ni RQAP. reer : REER et CELIAPP, déductibles.
  function impotParticulier(o) {
    const revenuNetAffaires = Math.max(0, o.revenu - (o.depensesPro || 0)), autres = Math.max(0, o.autresImposables || 0);
    const c = cotisationsAutonome(revenuNetAffaires);
    // Déduction pour frais de garde : au fédéral seulement (au Québec, c'est un crédit remboursable).
    const netAvantGarde = Math.max(0, revenuNetAffaires - c.deduction - (o.reer || 0) + autres);
    const imposableFed = Math.max(0, netAvantGarde - (o.deductionGarde || 0));
    const imposableQc = Math.max(0, netAvantGarde - deductionTravailleur(revenuNetAffaires));
    const ie = o.interetsEtudes || 0;
    const { fed, qc } = impotsDeBase(imposableFed, imposableQc, c.creditFederal, 0,
      ie * PAR.creditInteretsEtudes.federal, ie * PAR.creditInteretsEtudes.quebec, o.personneACharge);
    const cotisationFss = fss(revenuNetAffaires + autres);
    const total = fed + qc + c.rrq + c.rqap + cotisationFss;
    return { revenu: o.revenu, autres, imposable: imposableFed, imposableQc, revenuNetFed: imposableFed, revenuNetQc: imposableQc,
      fed, qc, rrq: c.rrq, rqap: c.rqap, ae: 0, fss: cotisationFss, total, totalGlobal: total,
      net: o.revenu + autres - total, tauxMoyen: o.revenu + autres > 0 ? total / (o.revenu + autres) : 0 };
  }

  /* Salarié : RRQ, RQAP et assurance-emploi de l'employé. Déductions fédérales : cotisations
     supplémentaires au RRQ, régime de retraite (RPA), cotisations syndicales, REER ;
     au Québec, déduction pour travailleurs, et un crédit de 10 % des cotisations syndicales
     (elles ne baissent pas le revenu net du Québec). Crédits fédéraux : montant de base
     (et le montant pour personne à charge admissible, s'il y a lieu), montant canadien pour
     emploi, RRQ de base, AE et RQAP. Aucune cotisation au FSS sur un salaire (l'employeur la paie). */
  function impotSalarie(o) {
    const s = Math.max(0, o.salaire || 0), q = PAR.rrq, r = PAR.rrqSalarie;
    const assiette = borne(s - q.exemption, 0, q.mga - q.exemption);
    const rrqBase = assiette * r.base, rrqSupp = assiette * r.supp1 + borne(Math.min(s, q.mgs) - q.mga, 0, q.mgs - q.mga) * r.supp2;
    const rqap = Math.min(s, PAR.rqap.max) * PAR.rqap.salarie;
    const ae = Math.min(s, PAR.ae.max) * PAR.ae.taux;
    const autres = Math.max(0, o.autresRevenus || 0), syndicat = Math.max(0, o.syndicat || 0);
    const netAvantGarde = Math.max(0, s + autres - rrqSupp - (o.rpa || 0) - (o.reer || 0));
    const netFed = Math.max(0, netAvantGarde - syndicat - (o.deductionGarde || 0));
    const netQc = Math.max(0, netAvantGarde - deductionTravailleur(s));
    const creditsFed = Math.min(PAR.montantEmploi, s) + rrqBase + ae + rqap;
    const { fed, qc } = impotsDeBase(netFed, netQc, creditsFed, 0, 0, syndicat * CREDIT_SYNDICAT_QC, o.personneACharge);
    const total = fed + qc + rrqBase + rrqSupp + rqap + ae;
    const brut = s + autres;
    return { revenu: brut, imposable: netFed, imposableQc: netQc, revenuNetFed: netFed, revenuNetQc: netQc,
      fed, qc, rrq: rrqBase + rrqSupp, rqap, ae, fss: 0, total,
      net: brut - total - (o.rpa || 0) - (o.syndicat || 0), tauxMoyen: brut > 0 ? total / brut : 0 };
  }

  /* Salaire et revenu d'entreprise la même année (la résidence, puis la pratique), ou le salaire seul d'un
     résident. RRQ : part de l'employé sur le salaire, puis les deux parts sur le revenu d'entreprise, dans ce
     qui reste sous les maximums ; RQAP de même ; assurance-emploi sur le salaire seulement. Déductions : RRQ
     supplémentaire, part « employeur » du travailleur autonome, cotisations syndicales, REER, frais de garde
     (fédéral) ; au Québec, déduction pour travailleurs et crédit de 10 % des cotisations syndicales.
     Crédits : montant canadien pour emploi, RRQ de base, assurance-emploi et RQAP ; droits de scolarité
     (fédéral au taux de base, Québec 8 %), intérêts d'un prêt étudiant et, s'il y a lieu, personne à charge
     admissible. Dividendes non déterminés (o.dividendes) : majoration dans le revenu imposable et le FSS,
     crédits d'impôt, le net de caisse compte le dividende reçu. Fonds des services de santé sur les revenus
     autres que d'emploi, majoration comprise. Sans salaire, le résultat est celui d'impotParticulier ;
     sans revenu d'entreprise, dividendes ni autres revenus, celui d'impotSalarie. */
  function impotMixte(o) {
    const q = PAR.rrq, r = PAR.rrqSalarie, rq = PAR.rqap;
    const s = Math.max(0, o.salaire || 0), affaires = Math.max(0, (o.revenu || 0) - (o.depensesPro || 0)), autres = Math.max(0, o.autresImposables || 0);
    const gains = s + affaires;
    // RRQ : assiette de base (sous le MGA, moins l'exemption) et supplémentaire (entre le MGA et le MGS), le salaire d'abord.
    const assTotal = borne(gains - q.exemption, 0, q.mga - q.exemption), assS = borne(s - q.exemption, 0, q.mga - q.exemption), assA = assTotal - assS;
    const s2S = borne(Math.min(s, q.mgs) - q.mga, 0, q.mgs - q.mga), s2A = borne(Math.min(gains, q.mgs) - q.mga, 0, q.mgs - q.mga) - s2S;
    const rrqBaseS = assS * r.base, rrqSuppS = assS * r.supp1 + s2S * r.supp2;
    const baseA = assA * q.base, suppA = assA * q.supp1 + s2A * q.supp2;
    const assurS = Math.min(s, rq.max), assurA = Math.min(affaires, Math.max(0, rq.max - assurS));
    const rqapS = assurS * rq.salarie, rqapA = assurA * rq.autonome;
    const ae = Math.min(s, PAR.ae.max) * PAR.ae.taux;
    const deductionAutonome = baseA / 2 + suppA + assurA * (rq.autonome - rq.salarie);
    const syndicat = Math.max(0, o.syndicat || 0), rpa = Math.max(0, o.rpa || 0);
    const dividendes = Math.max(0, o.dividendes || 0), dv = PAR.dividendes, majore = dividendes * (1 + dv.majoration);
    const netAvantGarde = Math.max(0, gains + autres + majore - rrqSuppS - deductionAutonome - rpa - (o.reer || 0));
    const imposableFed = Math.max(0, netAvantGarde - syndicat - (o.deductionGarde || 0));
    const imposableQc = Math.max(0, netAvantGarde - deductionTravailleur(gains));
    const ie = o.interetsEtudes || 0, scolarite = Math.max(0, o.scolarite || 0);
    const creditsFed = Math.min(PAR.montantEmploi, s) + rrqBaseS + ae + rqapS + baseA / 2 + assurA * rq.salarie + scolarite;
    const { fed, qc } = impotsDeBase(imposableFed, imposableQc, creditsFed, 0,
      ie * PAR.creditInteretsEtudes.federal + majore * dv.creditFederal,
      ie * PAR.creditInteretsEtudes.quebec + scolarite * PAR.scolariteQuebec + syndicat * CREDIT_SYNDICAT_QC + majore * (o.creditDividendesQc ?? dv.creditQuebec),
      o.personneACharge);
    const cotisationFss = fss(affaires + autres + majore);
    const rrq = rrqBaseS + rrqSuppS + baseA + suppA, rqap = rqapS + rqapA;
    const total = fed + qc + rrq + rqap + ae + cotisationFss, brut = s + Math.max(0, o.revenu || 0);
    return { revenu: brut, salaire: s, autres, dividendes, imposable: imposableFed, imposableQc, revenuNetFed: imposableFed, revenuNetQc: imposableQc,
      fed, qc, rrq, rqap, ae, fss: cotisationFss, syndicat, total, totalGlobal: total,
      net: brut + autres + dividendes - total - syndicat - rpa, tauxMoyen: brut + autres + dividendes > 0 ? total / (brut + autres + dividendes) : 0 };
  }

  /* Médecins résidents : entente FMRQ-MSSS 2021-2028, annexe I. Salaire annuel par niveau (1 à 8, soit R1 à R8 ;
     les niveaux 6 à 8 sont égaux). L'échelle augmente au 1er avril (art. 32.06 à 32.08), avec l'ajustement de
     0,11 % du 31 mars 2026 (art. 32.10 ; avis de la RAMQ du 16 juillet 2026 : 58 793 $ au niveau 1 et 89 229 $ au
     niveau 6 en 2026-2027) ; montants arrondis au dollar à chaque hausse, comme ceux de l'avis. Le niveau monte
     d'un cran à chaque année de formation, au 1er juillet (art. 32.01). Primes de responsabilité de garde et
     d'enseignement : à la fin de chaque période de 28 jours, 13 par année (art. 12.26 et 13.10). Après le
     31 mars 2028 (fin de l'entente), la dernière échelle. */
  const FMRQ = {
    echelles: [
      { du: "2025-04-01", salaires: [57296, 63228, 69161, 75092, 81024, 86957, 86957, 86957], garde: 706, enseignement: 279 },
      { du: "2026-04-01", salaires: [58793, 64880, 70968, 77054, 83141, 89229, 89229, 89229], garde: 725, enseignement: 286 },
      { du: "2027-04-01", salaires: [60851, 67151, 73452, 79751, 86051, 92352, 92352, 92352], garde: 750, enseignement: 296 },
    ],
    periodes: 13,
    finEntente: "2028-03-31",
    // Part des droits de scolarité payée par le résident, par année universitaire (art. 13.09).
    scolarite: { "2025-2026": 900, "2026-2027": 1100, "2027-2028": 1300 },
  };
  // Salaire annuel d'un résident au niveau donné, selon l'échelle en vigueur à une date (AAAA-MM-JJ), avec les primes.
  function salaireResident(o) {
    const niveau = Math.min(8, Math.max(1, Math.round(+o.niveau || 1))), date = o.date || FMRQ.echelles[0].du;
    const e = FMRQ.echelles.filter(x => x.du <= date).pop() || FMRQ.echelles[0];
    const salaire = e.salaires[niveau - 1], garde = o.primeGarde ? e.garde * FMRQ.periodes : 0, enseignement = o.primeEnseignement ? e.enseignement * FMRQ.periodes : 0;
    return { niveau, echelle: e.du, salaire, garde, enseignement, total: salaire + garde + enseignement };
  }

  /* Conjoints : le conjoint au revenu le plus élevé réclame le montant pour conjoint
     (fédéral) et reçoit les crédits non utilisés de l'autre (Québec). Rend des copies
     ajustées des deux résultats. */
  function transfertsConjoints(a, b) {
    const f = PAR.federal, q = PAR.quebec;
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
    const a = PAR.ace;
    const maxAce = ages.reduce((s, x) => s + (x < 6 ? a.moins6 : a.de6a17), 0);
    const rfnr = Math.max(0, o.revenuNetFed || 0);
    const reductionAce = rfnr <= a.seuil1 ? 0 : rfnr <= a.seuil2 ? (rfnr - a.seuil1) * a.taux1[n] : a.base2[n] + (rfnr - a.seuil2) * a.taux2[n];
    const ace = Math.max(0, maxAce - reductionAce);
    const f = PAR.allocationFamille, couple = o.couple !== false;
    const max = ages.length * f.max + (couple ? 0 : f.monoMax), min = ages.length * f.min + (couple ? 0 : f.monoMin);
    const allocationFamille = Math.max(min, max - Math.max(0, (o.revenuNetQc || 0) - (couple ? f.seuilCouple : f.seuilMono)) * f.taux);
    const fournitures = ages.filter(x => x >= 4 && x <= 16).length * f.fournitures;
    return { ace, allocationFamille, fournitures, total: ace + allocationFamille + fournitures };
  }

  /* Cotisation au régime public d'assurance médicaments, par adulte couvert. */
  function primeMedicaments(o) {
    const m = PAR.medicaments, enfants = Math.min(2, (o.ages || []).filter(a => a < 18).length);
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
    const d = PAR.dividendes, autres = autresRevenus || 0;
    const majore = dividendes * (1 + d.majoration);
    const imposable = majore + autres;
    const { fed, qc } = impotsDeBase(imposable, imposable, 0, 0, majore * d.creditFederal, majore * d.creditQuebec);
    const cotisationFss = fss(majore + autres);
    const total = fed + qc + cotisationFss;
    return { fed, qc, fss: cotisationFss, total, net: dividendes - total };
  }
  /* Médecin incorporé : la société reçoit les paiements de la RAMQ, paie les dépenses
     et son impôt (taux combiné ; au Québec, la déduction pour petite entreprise exige
     5 500 heures rémunérées, rare pour une société de médecin), puis verse des
     dividendes non déterminés : tout le bénéfice après impôt, ou un montant fixe. Le
     reste demeure dans la société. Même format que impotParticulier, pour la personne ;
     totalGlobal ajoute l'impôt de la société. */
  // creditDividendesQc : taux du crédit québécois d'une autre année (2,69 % dès 2027).
  function impotSociete(o) {
    const profit = Math.max(0, o.revenu - (o.depensesPro || 0) - (o.fraisSociete || 0));
    const impotSoc = profit * o.tauxSociete;
    const disponible = profit - impotSoc;
    const dividendes = o.retrait === "fixe" ? Math.min(disponible, Math.max(0, o.retraitFixe || 0)) : disponible;
    const d = PAR.dividendes, majore = dividendes * (1 + d.majoration), autres = Math.max(0, o.autresImposables || 0);
    const imposable = Math.max(0, majore + autres - (o.reer || 0));
    const ie = o.interetsEtudes || 0;
    const { fed, qc } = impotsDeBase(imposable, imposable, 0, 0,
      majore * d.creditFederal + ie * PAR.creditInteretsEtudes.federal, majore * (o.creditDividendesQc ?? d.creditQuebec) + ie * PAR.creditInteretsEtudes.quebec, o.personneACharge);
    const cotisationFss = fss(majore + autres);
    const total = fed + qc + cotisationFss;
    return { revenu: o.revenu, autres, dividendes, imposable, imposableQc: imposable, revenuNetFed: imposable, revenuNetQc: imposable,
      fed, qc, rrq: 0, rqap: 0, ae: 0, fss: cotisationFss, total, totalGlobal: total + impotSoc,
      net: dividendes + autres - total, tauxMoyen: o.revenu + autres > 0 ? (total + impotSoc) / (o.revenu + autres) : 0,
      societe: { profit, impotSociete: impotSoc, disponible, dividendes, retenu: disponible - dividendes, frais: o.fraisSociete || 0, depenses: o.depensesPro || 0 } };
  }

  /* Salaire et dividendes de la société la même année (fin de résidence, pratique incorporée) :
     une seule déclaration. Le bénéfice et le dividende se calculent comme dans impotSociete ;
     le salaire et le dividende majoré passent ensemble dans impotMixte. */
  function impotSalaireEtSociete(o) {
    const profit = Math.max(0, (o.revenu || 0) - (o.depensesPro || 0) - (o.fraisSociete || 0));
    const impotSoc = profit * (o.tauxSociete || 0);
    const disponible = profit - impotSoc;
    const dividendes = o.retrait === "fixe" ? Math.min(disponible, Math.max(0, o.retraitFixe || 0)) : disponible;
    const perso = impotMixte({
      salaire: o.salaire, revenu: 0, dividendes, reer: o.reer, interetsEtudes: o.interetsEtudes,
      autresImposables: o.autresImposables, scolarite: o.scolarite, syndicat: o.syndicat,
      deductionGarde: o.deductionGarde, personneACharge: o.personneACharge, creditDividendesQc: o.creditDividendesQc,
    });
    return { ...perso, dividendes,
      societe: { profit, impotSociete: impotSoc, disponible, dividendes, retenu: disponible - dividendes, frais: o.fraisSociete || 0, depenses: o.depensesPro || 0 },
      totalGlobal: perso.total + impotSoc };
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
     Au renouvellement, le taux change et le paiement est recalculé sur
     l'amortissement d'origine qui reste (il diminue d'un mois chaque mois et
     n'est pas raccourci par les remboursements anticipés). Un terme déjà
     échu au début du plan se renouvelle tout de suite. */
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
      // Terme déjà échu au début du plan : renouvelé au premier mois (le prochain terme part de là).
      if (x.finTerme && x.finTerme < debut) { x.finTerme = new Date(debut); x.termeEchu = true; }
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
      // Privilège de l'année civile : au 1er janvier ; au départ du plan, moins ce qui est déjà remboursé
      // par anticipation depuis janvier (le solde de janvier est estimé en le rajoutant au solde d'aujourd'hui).
      if (date.getMonth() === 0 || m === 0) {
        ds.forEach(d => {
          const deja = m === 0 && date.getMonth() !== 0 ? Math.max(0, +d.privilegeUtilise || 0) : 0;
          d.privilegeRestant = d.type === "hypotheque" ? Math.max(0, (d.s + deja) * (d.privilege || 0) / 100 - deja) : Infinity;
        });
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
    return { mois, dettes: ds.map(d => ({ id: d.id, nom: d.nom, fin: d.fin, interets: d.interets, interetsNets: d.interetsNets, tauxFinal: d.tauxCourant, premierRenouvellement: d.premierRenouvellement || null, termeEchu: !!d.termeEchu })),
      interetsTotaux, interetsNetsTotaux, gainsAttente, coutNet: interetsNetsTotaux - gainsAttente,
      libre: iLibre >= 0 ? mois[iLibre].date : null, iLibre, parAn };
  }

  /* Intérêts d'un prêt d'études payés sur chaque tranche de 12 mois à compter de debut,
     au paiement contractuel (minimums, sans remboursement accéléré). Les années après
     le remboursement sont à 0. C'est l'intérêt qui donne droit au crédit, pas le solde fois le taux. */
  function interetsEtudesPeriodes(dettes, debut, periodes) {
    const n = Math.max(0, Math.floor(+periodes) || 0), zeros = () => Array.from({ length: n }, () => 0);
    if (!n || !/^\d{4}-\d{2}$/.test(String(debut || ""))) return zeros();
    const etudes = (dettes || []).filter(d => (+d.creditImpot || 0) > 0 && (+d.solde || 0) > 0);
    if (!etudes.length) return zeros();
    const sim = simulerDettes(etudes, { debut, methode: "minimum", extraMensuel: 0, moisMax: n * 12 });
    const res = [];
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let m = i * 12; m < (i + 1) * 12 && m < sim.mois.length; m++) s += sim.mois[m].interetsEtudes || 0;
      res.push(s);
    }
    return res;
  }

  /* ============================================================
     ÉPARGNE : REEE, REER, CELI
     ============================================================ */
  /* REEE : subvention fédérale de 20 % (500 $ par an, 7 200 $ à vie) et
     québécoise de 10 % (250 $ par an, 3 600 $ à vie), sur les cotisations
     jusqu'à 17 ans. Cotisations plafonnées à 50 000 $ par enfant (déjà versées,
     champ cotisations, plus celles du plan). */
  const PLAFOND_REEE = 50000;
  function projeterReee(e, rendement) {
    return e.enfants.map(enf => {
      let solde = +enf.solde || 0, sv = +enf.subventionsRecues || 0, svq = 0, cot = 0;
      const deja = Math.max(0, +enf.cotisations || 0);
      const ans = Math.max(0, Math.min(17, 17 - (Number.isFinite(+enf.age) ? +enf.age : 17)));   // âge hors borne : rien à projeter
      for (let a = 0; a < ans; a++) {
        const c = Math.max(0, Math.min(+e.cotisationAnnuelle || 0, PLAFOND_REEE - deja - cot));
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
  /* CELIAPP (ARC, « Cotiser à un CELIAPP », consulté le 31 octobre 2026 :
     https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/compte-epargne-libre-impot-achat-premiere-propriete/cotiser-un-celiapp.html) :
     droits de 8 000 $ par année, plus les droits inutilisés reportés de l'année d'avant (au plus 8 000 $),
     sans dépasser 40 000 $ moins les cotisations déjà versées. Cotisation retenue de chaque année du plan
     (a = 0 : l'année en cours) ; le plafond à vie se compte sur les cotisations versées à ce jour, à défaut
     sur le solde (qui comprend les gains). */
  const CELIAPP = { annuel: 8000, report: 8000, vie: 40000 };
  function celiappParAn(ca, ans) {
    const voulu = Math.max(0, +(ca || {}).cotisationAnnuelle || 0);
    let cumul = ca && ca.cotisationsVersees != null && ca.cotisationsVersees !== "" ? +ca.cotisationsVersees || 0 : +(ca || {}).solde || 0;
    let report = Math.min(CELIAPP.report, Math.max(0, +(ca || {}).droitsReportes || 0));
    const res = [];
    for (let a = 0; a <= ans; a++) {
      const droits = CELIAPP.annuel + report, c = Math.min(voulu, droits, Math.max(0, CELIAPP.vie - cumul));
      res.push(c); cumul += c;
      report = Math.min(CELIAPP.report, droits - c);
    }
    return res;
  }

  function projeterValeurNette(o, simulation) {
    const ans = o.annees || 20;
    // Rendement mensuel de l'année a : constant, ou tiré d'une suite de rendements annuels (simulations).
    const rmDe = a => Math.pow(1 + (o.rendements ? o.rendements[a - 1] : o.rendement) / 100, 1 / 12) - 1;
    const rmSocDe = a => Math.pow(1 + (o.rendements ? o.rendements[a - 1] : o.rendement) / 100 * (1 - (o.societe && o.societe.impotPlacement != null ? o.societe.impotPlacement : 0.5)), 1 / 12) - 1;
    const voitures = o.voitures || [];
    let reer = o.reer.solde, celi = o.celi.solde, conj = o.actifsConjoint || 0, soc = o.societe ? o.societe.solde || 0 : 0;
    // CELIAPP : la cotisation de chaque année (plafonds annuel et à vie), versée par mois ; croissance à l'abri de l'impôt.
    const ca = o.celiapp || { solde: 0, cotisationAnnuelle: 0 }, celiappAns = celiappParAn(ca, ans);
    let celiapp = ca.solde || 0;
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
          celiapp = celiapp * (1 + rm) + celiappAns[a - 1] / 12;
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

  // Rendement annuel attendu d'un portefeuille selon sa part en actions (réparties à parts égales entre
  // actions canadiennes, américaines et internationales), avant frais, puis net des frais de gestion (RFG).
  function rendementProfil(pctActions, frais = 0) {
    const n = PAR.normes, a = Object.values(n.actions), actions = a.reduce((t, x) => t + x, 0) / a.length;
    const p = Math.min(100, Math.max(0, +pctActions || 0)) / 100, brut = p * actions + (1 - p) * n.revenuFixe;
    return { brut, frais: +frais || 0, net: brut - (+frais || 0) };
  }

  /* Frais de garde d'enfants de 16 ans ou moins.
     Québec : crédit remboursable = taux selon le revenu familial × frais admissibles (sans la contribution
     réduite d'une place subventionnée), plafonnés par enfant ; indexQc : indexation des années futures.
     Fédéral : déduction plafonnée par enfant et aux 2/3 du revenu gagné de celui qui la demande. */
  function fraisGarde(o) {
    const g = PAR.garde, ages = (o.ages || []).filter(a => a <= 16), indexQc = o.indexQc || 1;
    const plafond = p => ages.reduce((t, a) => t + (a < 7 ? p.moins7 : p.autres), 0);
    const plafondQc = plafond(g.quebec) * indexQc, plafondFed = plafond(g.federal);
    const admissibleQc = Math.min(Math.max(0, o.fraisQc || 0), plafondQc);
    const taux = g.quebec.taux.find(([seuil]) => (o.revenuFamilial || 0) <= seuil * indexQc)[1];
    const deduction = Math.min(Math.max(0, o.fraisFed || 0), plafondFed, Math.max(0, o.revenuGagne || 0) * g.federal.partRevenuGagne);
    return { plafondQc, admissibleQc, taux, creditQc: admissibleQc * taux, plafondFed, deduction };
  }

  const Calc = { CELIAPP, celiappParAn, ACTES, CNESST, valeurActes, supervisionOuVisites, demiJourneeActes, P2026, P2027, parametres, utiliserAnnee, avecAnnee, parametresActifs: () => PAR, VISITES, PRISE_EN_CHARGE, TARIFS_DEFAUT, TARIFS_LIEU, MONTANTS_LIEU, RAMQ, PCT_AU_DELA, PCT_GARDE, GARDE_MAX_94, SUPERVISION_MAX_APRES_MIDI, partAssiduite, lieuTarifs, montantsLieu, montantsVolume, tauxPolyvalence, SEUILS_POLYVALENCE, ACTIVITES_POLYVALENTES, compensationCabinet, tarifVisite, revenuGmfu, joursActivite, revenuActivite, impotParticulier, impotSalarie, impotMixte, FMRQ, salaireResident, transfertsConjoints, prestationsFamille, primeMedicaments, tauxMarginal,
    remboursementReer, impotDividendes, impotSociete, impotSalaireEtSociete, comparerSociete, simulerDettes, interetsEtudesPeriodes, tauxReel, tauxMensuel, moisRestants, paiementPour, projeterReee, projeterValeurNette, rendementProfil, fraisGarde };
  if (typeof module !== "undefined" && module.exports) module.exports = Calc;
  else racine.Calc = Calc;
})(typeof window !== "undefined" ? window : globalThis);
