/* WealthMorand — valeurs de départ et catalogues : l'exemple affiché au premier lancement,
   les catalogues (dépenses, autres revenus, dépenses professionnelles), les milieux et les
   activités, les champs des panneaux « Modifier » et les cas de vérification de l'impôt.
   Rien ici ne lit ni n'écrit les données de l'utilisateur : app.js s'en charge. */
(function () {
  "use strict";
  const C = window.Calc;

  /* ============================================================
     EXEMPLE : valeurs fictives, affichées tant qu'on n'a pas entré sa
     situation. Les tarifs RAMQ et les paramètres fiscaux sont réels.
     Un médecin qui débute en GMF (non universitaire), payé à l'acte :
     7 demi-journées de rendez-vous à 6 patients et 1 demi-journée de
     sans rendez-vous à 12 patients ; une semaine d'hospitalisation toutes
     les 6 semaines (environ 16 patients par jour). Seul(e), locataire.
     ============================================================ */
  const moisCourant = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();
  const EXEMPLE = {
    version: 1,
    meta: { exemple: true, misAJour: null },
    confirmes: {},
    revenu: {
      milieu: "clinique", annee: "premiere", modeBudget: "acte",
      // 38 semaines en clinique : 52, moins 6 de vacances et environ 8 à l'hôpital.
      demiJournees: 7, enseignement: 0, heuresParDJ: 4, semaines: 38, patientsParDJ: 6,
      demiJourneesSRV: 1, patientsSRV: 12,
      residents: 0, patientsPendantSupervision: 0, autresRevenus: 0,
      inscritsDebut: 0, nouveauxGuichet: 500, nouveauxSansMedecin: 0, nouveauxTransferes: 0,
      semainesArrivee: 38, partVulnerable: 20, partGroupe2: 0, partGroupe34: 0, assiduite80: true, anneePratique: "5", membreGmf: true, pctPatientsVus: 80,
      mix: { suivi: 70, suiviV: 15, perioV: 5, pedia: 5, gross: 5 },
      // Taux horaire, mixte et supervision (Brochure no 1) ; forfaits, suppléments et demi-per diem de la colonne cabinet.
      ...C.RAMQ, ...C.montantsLieu("cabinet", 1), listeEnseignement: "1",
      pctActe: 100,
      fraisCabinetPct: 30, fraisCabinetMois: 0, compensationMode: "auto", compensationCabinet: 0, fraisCabinetTousModes: false,
      // Activités en établissement, en plus de la pratique principale.
      partTresVulnerable: 0, primeInscription: 0,
      externes: 0, patientsParResident: 4.5, patientsParExterne: 2.5, supervisionFacturation: "acte",
      pctSrvComplexe: 50, majorationPct: 0,
      // Tarifs de la colonne cabinet ou établissement (selon la pratique, ou lieuTarifs), sauf s'ils ont été modifiés.
      lieuTarifs: "auto", tarifsModifies: false,
      tarifs: JSON.parse(JSON.stringify(C.TARIFS_LIEU.cabinet)),
      // Autres revenus : une ligne par source (voir CATALOGUE_REVENUS) ; montants à 0 au départ.
      lignes: [],
      activites: [{ id: "a1", type: "hospitalisation", nom: "", nombre: 7, frequence: "cycle", cycle: 6, calcul: "patients", parJour: 960, patients: 16, parPatient: 60 }],
    },
    impot: { depensesPro: 3000, structure: "particulier", depensesProMode: "total", depensesProDetail: [] },
    // Union : mariés (ou union civile) ou conjoints de fait ; ces derniers forment un couple
    // pour l'impôt après 12 mois de vie commune ou avec un enfant commun.
    conjointe: { active: false, designation: "partenaire", lien: "maries", depuis12mois: true, enfantCommun: false, statut: "salarie", salaire: 0, rpa: 0, syndicat: 0, revenuAutonome: 0, depensesAutonome: 0,
      autresRevenus: 0, medicamentsPublic: false, partMaison: 0, epargne: 0, epargneMensuelle: 0, voiture: 0 },
    // Hypothèses de l'avenir. Le scénario réaliste suit les Normes d'hypothèses de
    // projection 2026 (Institut de planification financière et FP Canada).
    scenarios: {
      choisi: "realiste", dollarsAujourdhui: false, horizon: 20,
      // Probabilité de réussite : écart type des rendements annuels (portefeuille équilibré : environ 10 %).
      volatilite: 10,
      prudent: { rendement: 3.5, croissanceMaison: 1.5, depreciationAuto: 20, ecartTaux: 1, inflation: 3, hausseRevenus: 2 },
      realiste: { rendement: 5, croissanceMaison: 3.1, depreciationAuto: 15, ecartTaux: 0, inflation: 2.1, hausseRevenus: 3.1 },
      optimiste: { rendement: 6.5, croissanceMaison: 4.5, depreciationAuto: 12, ecartTaux: -0.5, inflation: 2, hausseRevenus: 3.5 },
    },
    famille: { calculAuto: true, versementA: "moi", medicamentsPublicMoi: true },
    societe: { tauxSociete: 20.5, fraisSociete: 4000, retrait: "tout", retraitFixe: 120000, solde: 0 },
    menage: { conjointNetMensuel: 0, allocationsAnnuelles: 0, autresRevenusMensuels: 0, partCommunMoi: 100 },
    // Valeurs fictives ; les autres cases du catalogue partent à 0.
    budget: [
      { id: "loyer", k: "loyer", nom: "", montant: 1800, periode: "mois", qui: "moi" },
      { id: "assuranceHabitation", k: "assuranceHabitation", nom: "", montant: 300, periode: "an", qui: "moi" },
      { id: "electricite", k: "electricite", nom: "", montant: 70, periode: "mois", qui: "moi" },
      { id: "epicerie", k: "epicerie", nom: "", montant: 500, periode: "mois", qui: "moi" },
      { id: "cellulaires", k: "cellulaires", nom: "", montant: 70, periode: "mois", qui: "moi" },
      { id: "internet", k: "internet", nom: "", montant: 70, periode: "mois", qui: "moi" },
      { id: "loisirs", k: "loisirs", nom: "", montant: 200, periode: "mois", qui: "moi" },
    ],
    dettes: [
      { id: "d1", nom: "Marge de crédit", type: "marge", solde: 65000, limite: 0, taux: 4.5, paiement: 0, frequence: "mois", interetsSeulement: true, finTerme: "", tauxRenouvellement: 0, privilege: 0, creditImpot: 0, partMoi: 100, paiementMoi: 100 },
    ],
    strategie: { methode: "avalanche", extraMode: "auto", extraManuel: 1000, reerSurDettes: true, debut: moisCourant },
    epargne: {
      rendement: 5, encaisse: 0,
      reee: { cotisationAnnuelle: 0, enfants: [] },
      reer: { solde: 25000, droits: 0, cotisationAnnuelle: 0 },
      celi: { solde: 0, cotisationAnnuelle: 0 },
      // CELIAPP : 8 000 $ par année, 40 000 $ à vie ; déductible ; retrait sans impôt pour une première propriété.
      celiapp: { solde: 0, cotisationAnnuelle: 0 },
      // Taux d'imposition prévu au retrait du REER, pour le comparer au CELI.
      tauxRetrait: 35,
      // Frais de gestion des placements (RFG), en % ; 0 : non précisé.
      frais: 0,
      // Répartition visée (profil) et part actuelle en actions (null : non précisée).
      profil: "equilibre", pctActionsCible: 60, pctActionsActuel: null,
    },
    // Catégories du budget où l'on inscrit un seul total plutôt que le détail.
    budgetTotaux: {},
    // Objectifs d'épargne (montant et date) ; relevés de la valeur nette et plan de référence.
    objectifs: [],
    suivi: { reference: null, instantanes: [] },
    // Indépendance financière, jalons personnels, dossier pour les proches, plans de comparaison.
    independance: { multiple: 25, depenses: 0, anneeNaissance: 0 },
    jalonsPerso: [],
    dossier: {},
    plans: [],
    // Bilans du mois : revenu net reçu et dépenses, d'après le relevé.
    bilans: [],
    // Logement : propriétaire (maison et hypothèque) ou locataire (loyer au budget, pas de maison).
    actifs: { logement: "locataire", maison: { valeur: 0, part: 0, croissance: 3 }, voiture: { valeur: 0, depreciation: 15, remplacementAns: 0, prixNeuf: 40000 }, actifsConjoint: 0, autres: [] },
  };

  // Identifiant d'une ligne ajoutée à la main (dépense, revenu, dette…).
  function nouvelId(p) { return p + Math.random().toString(36).slice(2, 8); }

  /* ============================================================
     CATALOGUE DES DÉPENSES RÉCURRENTES : une case par dépense possible.
     Chaque case garde son montant, sa période et qui la paie ; les
     paiements de dettes et l'épargne viennent de leurs propres sections.
     ============================================================ */
  const CATALOGUE = [
    { cat: "Logement", items: [
      ["loyer", "Loyer", "mois", "moi"],
      ["taxesMunicipales", "Taxes municipales", "an", "moi"],
      ["taxesScolaires", "Taxe scolaire", "an", "moi"],
      ["assuranceHabitation", "Assurance habitation ou de locataire", "an", "moi"],
      ["electricite", "Électricité", "mois", "moi"],
      ["chauffage", "Chauffage : gaz, mazout ou bois", "mois", "moi"],
      ["eau", "Eau et égouts, si facturés à part", "an", "moi"],
      ["entretienMaison", "Entretien et réparations de la maison", "mois", "moi"],
      ["deneigement", "Déneigement", "an", "moi"],
      ["terrain", "Terrain, piscine, paysagement", "an", "moi"],
      ["alarme", "Système d'alarme", "mois", "moi"],
      ["meubles", "Meubles et électroménagers", "an", "moi"],
      ["condo", "Frais de copropriété (condo)", "mois", "moi"],
      ["entreposage", "Entreposage", "mois", "moi"],
    ] },
    { cat: "Alimentation", items: [
      ["epicerie", "Épicerie", "mois", "moi"],
      ["restaurants", "Restaurants et commandes", "mois", "moi"],
      ["lunchs", "Lunchs et cafés au travail", "mois", "moi"],
      ["alcool", "Alcool et SAQ", "mois", "moi"],
    ] },
    { cat: "Transport", items: [
      ["assuranceAuto", "Assurance auto", "mois", "moi"],
      ["essence", "Essence ou recharge", "mois", "moi"],
      ["essence2", "Essence ou recharge, 2e véhicule", "mois", "conjoint"],
      ["entretienAuto", "Entretien et pneus", "mois", "moi"],
      ["immatriculation", "Immatriculation et permis de conduire", "an", "moi"],
      ["stationnement", "Stationnement", "mois", "moi"],
      ["transportCommun", "Transport en commun et taxi", "mois", "moi"],
      ["locationAuto", "Location d'auto (crédit-bail)", "mois", "moi"],
      ["caa", "CAA et assistance routière", "an", "moi"],
      ["veloPartage", "Vélo, BIXI, Communauto", "mois", "moi"],
    ] },
    { cat: "Enfants", items: [
      ["garderie", "Garderie ou CPE", "mois", "moi"],
      ["couches", "Couches, lait et soins", "mois", "moi"],
      ["vetementsEnfants", "Vêtements et chaussures", "mois", "moi"],
      ["activitesEnfants", "Activités, sports et cours", "mois", "moi"],
      ["campsJour", "Camps de jour et semaine de relâche", "an", "moi"],
      ["gardiennage", "Gardiennage", "mois", "moi"],
      ["jouets", "Jouets, livres, fêtes d'amis", "mois", "moi"],
      ["ecole", "École : frais, fournitures et service de garde", "mois", "moi"],
      ["ecolePrivee", "École privée : droits de scolarité", "an", "moi"],
      ["argentPoche", "Argent de poche", "mois", "moi"],
    ] },
    { cat: "Santé", items: [
      ["assuranceMedicaments", "Assurance médicaments", "an", "moi"],
      ["medicaments", "Médicaments et pharmacie", "mois", "moi"],
      ["dentiste", "Dentiste", "an", "moi"],
      ["lunettes", "Optométriste et lunettes", "an", "moi"],
      ["therapies", "Physiothérapie, psychologue et autres soins", "an", "moi"],
      ["orthodontie", "Orthodontie", "an", "moi"],
      ["assuranceSante", "Assurance santé et dentaire privée", "mois", "moi"],
    ] },
    { cat: "Assurances personnelles", items: [
      ["assuranceInvalidite", "Assurance invalidité", "mois", "moi"],
      ["assuranceVie", "Assurance vie", "mois", "moi"],
      ["maladiesGraves", "Assurance maladies graves", "mois", "moi"],
      ["assuranceVoyage", "Assurance voyage", "an", "moi"],
    ] },
    { cat: "Télécom et abonnements", items: [
      ["cellulaires", "Cellulaires", "mois", "moi"],
      ["internet", "Internet", "mois", "moi"],
      ["television", "Télévision et diffusion en continu", "mois", "moi"],
      ["abonnements", "Autres abonnements : applications, journaux", "mois", "moi"],
      ["telephoneFixe", "Téléphone fixe", "mois", "moi"],
      ["infonuagique", "Logiciels et stockage en ligne", "mois", "moi"],
    ] },
    { cat: "Personnel et loisirs", items: [
      ["vetementsAdultes", "Vêtements des adultes", "mois", "moi"],
      ["soinsPersonnels", "Coiffure et soins personnels", "mois", "moi"],
      ["sport", "Gym et sports", "mois", "moi"],
      ["loisirs", "Sorties et loisirs", "mois", "moi"],
      ["vacances", "Vacances et voyages", "an", "moi"],
      ["cadeaux", "Cadeaux et fêtes", "an", "moi"],
      ["animaux", "Animaux", "mois", "moi"],
      ["dons", "Dons", "an", "moi"],
      ["electronique", "Électronique et ordinateurs", "an", "moi"],
      ["clubs", "Clubs et cotisations", "an", "moi"],
      ["tabac", "Tabac et vapotage", "mois", "moi"],
    ] },
    { cat: "Finances", items: [
      ["fraisBancaires", "Frais bancaires", "mois", "moi"],
      ["comptable", "Comptable et déclarations de revenus", "an", "moi"],
      ["pensionAlimentaire", "Pension alimentaire", "mois", "moi"],
      ["fraisPlacements", "Frais de gestion de placements", "an", "moi"],
      ["aideFamille", "Aide financière à la famille", "mois", "moi"],
    ] },
    { cat: "Imprévus", items: [
      ["imprevus", "Imprévus", "mois", "moi"],
    ] },
  ];
  /* AUTRES REVENUS : une ligne par source possible, à 0 au départ. pro : revenu professionnel
     (avec la pratique : impôt, RRQ, RQAP) ; sinon imposable, sans RRQ ni RQAP. */
  const CATALOGUE_REVENUS = [
    ["formulaires", "Formulaires et services non assurés", true, "SAAQ, assureurs, notes et certificats médicaux facturés aux patients ou aux tiers."],
    ["expertises", "Expertises médicales", true, "Évaluations pour la CNESST, la SAAQ, des assureurs ou des avocats."],
    ["medicoAdmin", "Activités médico-administratives", true, "Comités, chef de département ou de GMF, médecin responsable : per diem et forfaits."],
    ["enseignement", "Enseignement et conférences (hors RAMQ)", true, "Chargé de cours, conférences, préceptorat payé par l'université."],
    ["ressourcement", "Formation continue remboursée", true, "Allocations de ressourcement et per diem de formation."],
    ["prive", "Services privés ou hors RAMQ", true, "Télémédecine privée, médecine du voyage, services aux entreprises."],
    ["ramq", "Autres paiements de la RAMQ", true, "Ce qui n'entre ni dans la pratique ni dans les activités en établissement."],
    ["location", "Revenus de location, après dépenses", false, "Logement ou local loué."],
    ["placements", "Revenus de placements hors REER et CELI", false, "Intérêts et dividendes d'un compte non enregistré."],
  ];
  const ITEMS_REVENUS = new Map(CATALOGUE_REVENUS.map(([k, nom, pro, aide]) => [k, { k, nom, pro, aide }]));
  // Toutes les cases du catalogue, dans l'ordre, puis les lignes ajoutées à la main.
  function normaliserLignes(lignes) {
    const parCle = new Map((lignes || []).filter(l => l.k && ITEMS_REVENUS.has(l.k)).map(l => [l.k, l]));
    const r = CATALOGUE_REVENUS.map(([k]) => { const l = parCle.get(k); return { id: k, k, nom: "", montant: l ? +l.montant || 0 : 0, periode: l ? l.periode || "an" : "an" }; });
    for (const l of lignes || []) if (!l.k || !ITEMS_REVENUS.has(l.k)) r.push({ id: l.id || nouvelId("r"), k: null, nom: l.nom || "Revenu", montant: +l.montant || 0, periode: l.periode || "an", pro: l.pro !== false });
    return r;
  }
  const annuelLigne = l => (+l.montant || 0) * (l.periode === "mois" ? 12 : 1);
  const estPro = l => l.k ? ITEMS_REVENUS.get(l.k).pro : l.pro !== false;
  const nomLigne = l => l.k ? ITEMS_REVENUS.get(l.k).nom : l.nom;
  /* DÉPENSES PROFESSIONNELLES déductibles : un total, ou le détail ligne par ligne. */
  const CATALOGUE_PRO = [
    ["cmq", "Collège des médecins : cotisation annuelle", "1 930 $ pour un membre actif en 2026-2027 (grille tarifaire du CMQ)."],
    ["fmoq", "FMOQ et association régionale", "Retenue par la RAMQ sur vos paiements (5 % jusqu'au plein montant annuel)."],
    ["acpm", "ACPM : responsabilité professionnelle, part non remboursée", "Au Québec, environ 515 $ en moyenne en 2027, plus 9 % de taxe ; selon votre code de travail."],
    ["formation", "Formation continue et congrès", "Inscriptions, déplacements et hébergement."],
    ["abonnements", "Livres, abonnements et applications médicales", "UpToDate, revues, applications cliniques."],
    ["equipement", "Équipement et instruments médicaux", "Stéthoscope, otoscope, trousse, petit matériel."],
    ["telecom", "Cellulaire et internet : partie professionnelle", ""],
    ["auto", "Auto : partie professionnelle", "Déplacements entre lieux de travail ; pas le trajet entre la maison et le travail."],
    ["bureau", "Bureau à domicile", "Part des frais de la maison, si vous y travaillez."],
    ["fraisGeneraux", "Assurance frais généraux", "Paie les frais du cabinet pendant une invalidité."],
    ["comptable", "Comptable et frais de gestion", ""],
    ["autres", "Autres dépenses professionnelles", ""],
  ];
  const ITEMS_PRO = new Map(CATALOGUE_PRO.map(([k, nom, aide]) => [k, { k, nom, aide }]));
  const normaliserPro = l => { const m = new Map((l || []).map(x => [x.k, x])); return CATALOGUE_PRO.map(([k]) => ({ k, montant: m.has(k) ? +m.get(k).montant || 0 : 0, periode: m.has(k) ? m.get(k).periode || "an" : "an", mois: m.has(k) ? +m.get(k).mois || 0 : 0 })); };
  const ITEMS = new Map(CATALOGUE.flatMap(c => c.items.map(([k, nom, periode, qui]) => [k, { k, nom, periode, qui, cat: c.cat }])));
  const AIDE_CATEGORIE = {
    "Santé": "Sans assurance collective, la prime du régime public d'assurance médicaments se paie avec l'impôt du Québec : inscrivez-la ici.",
    "Finances": "Les dépenses professionnelles déductibles se saisissent dans Impôt, bouton Modifier.",
    "Logement": "Les paiements d'hypothèque viennent de la section Dettes.",
  };

  /* Une case par dépense du catalogue, dans l'ordre du catalogue, puis les
     dépenses ajoutées à la main. Une ancienne ligne sans clé devient une
     dépense ajoutée. */
  function normaliserBudget(budget) {
    const parCle = new Map((budget || []).filter(b => b.k && ITEMS.has(b.k)).map(b => [b.k, b]));
    const resultat = [];
    for (const [k, it] of ITEMS) {
      const b = parCle.get(k);
      resultat.push({ id: k, k, nom: "", montant: b ? +b.montant || 0 : 0, periode: b ? b.periode : it.periode, qui: b ? b.qui : it.qui, mois: b ? +b.mois || 0 : 0 });
    }
    for (const b of budget || []) if (!b.k || !ITEMS.has(b.k)) resultat.push({ id: b.id || nouvelId("b"), k: null, nom: b.nom || "Dépense", montant: +b.montant || 0, periode: b.periode || "mois", qui: b.qui || "commun", mois: +b.mois || 0 });
    return resultat;
  }
  const nomDepense = b => b.k ? ITEMS.get(b.k).nom : b.nom;
  const categorie = b => b.cat || (b.k ? ITEMS.get(b.k).cat : "Autres dépenses");

  /* Résultats de l'outil de calcul du revenu disponible du ministère des Finances du
     Québec (version de mai 2026, revenus d'emploi), relevés le 25 octobre 2026.
     WealthMorand recalcule les mêmes cas à chaque ouverture pour mesurer l'écart. */
  const VERIFICATION = [{"couple": true, "salaires": [190000, 60000], "ages": [4, 3], "officiel": {"qc": 40789, "fed": 34389, "rrq": 8455, "rqap": 701, "ae": 1676, "af": 2442, "fournitures": 127, "ace": 860, "prime": 1532}}, {"couple": true, "salaires": [100000, 0], "ages": [4, 3], "officiel": {"qc": 10487, "fed": 9131, "rrq": 4895, "rqap": 430, "ae": 896, "af": 4655, "fournitures": 127, "ace": 9378, "prime": 1532}}, {"couple": false, "salaires": [190000], "ages": [], "officiel": {"qc": 35143, "fed": 29962, "rrq": 4895, "rqap": 443, "ae": 896, "af": 0, "fournitures": 0, "ace": 0, "prime": 766}}, {"couple": true, "salaires": [80000, 40000], "ages": [4, 3], "officiel": {"qc": 12070, "fed": 9862, "rrq": 6995, "rqap": 516, "ae": 1416, "af": 3920, "fournitures": 127, "ace": 8248, "prime": 1532}}, {"couple": true, "salaires": [250000, 0], "ages": [4, 3], "officiel": {"qc": 47939, "fed": 42881, "rrq": 4895, "rqap": 443, "ae": 896, "af": 2442, "fournitures": 127, "ace": 828, "prime": 1532}}, {"couple": true, "salaires": [190000, 15000], "ages": [4, 3], "officiel": {"qc": 34447, "fed": 29797, "rrq": 5620, "rqap": 507, "ae": 1091, "af": 2442, "fournitures": 127, "ace": 3400, "prime": 1532}}, {"couple": false, "salaires": [60000], "ages": [], "officiel": {"qc": 5647, "fed": 4427, "rrq": 3560, "rqap": 258, "ae": 780, "af": 0, "fournitures": 0, "ace": 0, "prime": 766}}, {"couple": true, "salaires": [140000, 90000], "ages": [7, 3], "officiel": {"qc": 33507, "fed": 28249, "rrq": 9791, "rqap": 830, "ae": 1791, "af": 2442, "fournitures": 127, "ace": 758, "prime": 1532}}];

  /* Pratique principale, toujours au calcul détaillé (tarifs de l'onglet B de la RAMQ) :
     GMF ou clinique privée (à l'acte, avec frais de cabinet), GMF-U et CLSC (taux horaire,
     mixte ou à l'acte). Urgence, hospitalisation, obstétrique… : activités à ajouter. */
  const MODES_ETAB = ["horaire", "mixte", "acte"];
  const MILIEUX = {
    clinique: { nom: "GMF ou clinique", long: "GMF ou clinique privée", modes: ["acte"], aide: "À l'acte, avec les frais de cabinet. Tarifs des visites de l'onglet B ; ajustez la part payée à l'acte au besoin." },
    gmfu: { nom: "GMF-U", long: "GMF-U", modes: MODES_ETAB, aide: "Taux horaire, mixte ou à l'acte ; enseignement et supervision de résidents." },
    clsc: { nom: "CLSC", long: "CLSC", modes: MODES_ETAB, aide: "Taux horaire, mixte ou à l'acte." },
  };
  const SI_ETAB = "revenu.milieu=gmfu|clsc", SI_GMFU = "revenu.milieu=gmfu";
  /* Activités en établissement : revenu brut par jour (ou quart) de départ, indicatif,
     à remplacer par le vôtre ; ou patients par jour × revenu moyen par patient. */
  const ACTIVITES = {
    urgence: { nom: "Urgence", unite: "quart", parJour: 1500, patients: 25, parPatient: 60 },
    hospitalisation: { nom: "Hospitalisation", unite: "jour", parJour: 960, patients: 16, parPatient: 60 },
    obstetrique: { nom: "Obstétrique", unite: "jour", parJour: 1200, patients: 4, parPatient: 300 },
    palliatifs: { nom: "Soins palliatifs", unite: "jour", parJour: 900, patients: 12, parPatient: 75 },
    chsld: { nom: "CHSLD", unite: "jour", parJour: 800, patients: 20, parPatient: 40 },
    garde: { nom: "Garde en disponibilité", unite: "jour", parJour: 250, patients: 0, parPatient: 0 },
    autre: { nom: "Autre activité", unite: "jour", parJour: 0, patients: 0, parPatient: 0 },
  };
  const nomActivite = a => a.nom || (ACTIVITES[a.type] || ACTIVITES.autre).nom;

  /* ============================================================
     CHAMPS : chaque entrée décrit un champ lié à un chemin de l'état. Pn donne la
     désignation du ou de la partenaire (« Partenaire », « Conjointe »…), lue dans les données.
     ============================================================ */
  const champs = ({ Pn }) => ({
    revenu: [
      { g: "Votre pratique" },
      { p: "revenu.milieu", l: "Pratique principale", t: "select", o: Object.entries(MILIEUX).map(([k, m]) => [k, m.long]), h: "Urgence, hospitalisation, obstétrique et autres activités en établissement : ajoutez-les dans la page Revenu." },
      { p: "revenu.annee", l: "Année calculée", t: "select", o: [["premiere", "Première année de pratique"], ["type", "Année type, plein régime"]], h: "Première année : arrivée des nouveaux patients au fil de l'année." },
      { p: "revenu.anneePratique", l: "Année de pratique, depuis le permis", t: "select", o: [["2", "2e année"], ["3", "3e année"], ["4", "4e année"], ["5", "5e année ou plus"]], si: "revenu.annee=type&details",
        h: "Les quatre premières années, la majoration de la pratique polyvalente s'obtient avec moins de patients inscrits (EP 40, par. 16.04)." },
      { p: "revenu.semaines", l: "Semaines en clinique par année", u: "sem.", h: "Sans les vacances ni les semaines passées à l'hôpital." },
      { p: "revenu.majorationPct", l: "Majoration selon le territoire", u: "%", s: 0.5, si: "details", h: "Rémunération différente en territoire désigné (annexes XII et XII-A) : par exemple 15 pour 115 %. Sur les visites, les heures, les activités et les forfaits d'inscription ; pas sur les suppléments. 0 ailleurs." },
      { g: "Vos demi-journées" },
      { p: "revenu.demiJournees", l: "Demi-journées de rendez-vous par semaine", u: "d.-j.", h: "Vos propres patients. En GMF-U, enseignement compris." },
      { p: "revenu.patientsParDJ", l: "Patients par demi-journée de rendez-vous", u: "pat.", s: 0.5 },
      { p: "revenu.demiJourneesSRV", l: "Demi-journées de sans rendez-vous (SRV)", u: "d.-j.", h: "Urgences mineures, souvent des patients d'autres médecins. Au mixte et à l'acte, chaque patient est payé au tarif de la visite ponctuelle, plus bas en moyenne qu'un suivi ; au taux horaire, à l'heure." },
      { p: "revenu.patientsSRV", l: "Patients par demi-journée de SRV", u: "pat.", s: 0.5, si: "revenu.demiJourneesSRV" },
      { p: "revenu.heuresParDJ", l: "Heures par demi-journée", u: "h", s: 0.25, si: "details" },
      { g: "Enseignement et apprenants", si: SI_GMFU },
      { p: "revenu.enseignement", l: "Demi-journées d'enseignement par semaine", u: "d.-j." },
      { p: "revenu.residents", l: "Résidents supervisés en même temps", u: "rés." },
      { p: "revenu.externes", l: "Externes supervisés en même temps", u: "ext." },
      { p: "revenu.supervisionFacturation", l: "Au mixte, facturation des demi-journées de supervision", t: "select", o: [["acte", "Intervention de supervision"], ["visites", "Visites vues par les apprenants"]],
        h: "Au mixte, pour chaque demi-journée : l'intervention de supervision (24,87 $ par 15 minutes, jusqu'à 3,5 h, quel que soit le nombre d'apprenants) ou les visites des apprenants (annexe XXIII, B-2). À l'acte, les visites des apprenants sont toujours facturées." },
      { p: "revenu.patientsParResident", l: "Patients vus par un résident, par demi-journée", u: "pat.", s: 0.5, si: "revenu.residents", h: "En moyenne 4 à 5." },
      { p: "revenu.patientsParExterne", l: "Patients vus par un externe, par demi-journée", u: "pat.", s: 0.5, si: "revenu.externes", h: "En moyenne 2 à 3." },
      { p: "revenu.listeEnseignement", l: "Région du lieu de formation", t: "select", o: [["1", "Liste 1 : régions régulières"], ["2", "Liste 2 : régions du par. 5.03 de l'EP 42"]],
        h: "Liste 2, demi-per diem plus élevés : territoires des annexes XII et XII-A, et les réseaux locaux d'Alphonse-Desjardins (CLSC Laurier-Station), Lanaudière-Nord, Argenteuil, Rivière-du-Nord–Mirabel-Nord, Pays-d'en-Haut, Laurentides, Haute-Yamaska, Richelieu-Yamaska, Sorel-Tracy, Vaudreuil-Soulanges, Haut-Saint-Laurent, Suroît, Haut-Richelieu-Rouville, Jardins-Roussillon et Pommeraie." },
      { p: "revenu.patientsPendantSupervision", l: "Patients vus vous-même pendant la supervision", u: "pat.", s: 0.5, si: "details" },
      { g: "Votre clientèle" },
      { p: "revenu.inscritsDebut", l: "Patients inscrits au départ", u: "pat." },
      { p: "revenu.nouveauxGuichet", l: "Nouveaux patients du guichet d'accès", u: "pat." },
      { p: "revenu.partVulnerable", l: "Patients vulnérables", u: "%", h: "Au moins un code de vulnérabilité (EP 40, par. 5.01). Forfait annuel versé par la RAMQ en 4 paiements." },
      { p: "revenu.partGroupe2", l: "Vulnérables à deux catégories", u: "% des vuln.", si: "revenu.partVulnerable",
        h: "Forfait annuel à 150 % (groupe II) : 70,50 $ en établissement, 93,75 $ en cabinet." },
      { p: "revenu.partGroupe34", l: "Vulnérables à trois catégories ou plus, ou avec santé mentale", u: "% des vuln.", si: "revenu.partVulnerable",
        h: "Trois catégories ou plus, ou deux dont la santé mentale (codes 01, 10, 11, 20) ou la déficience intellectuelle : forfait à 200 % (groupes III et IV), 94 $ en établissement, 125 $ en cabinet." },
      { p: "revenu.partTresVulnerable", l: "Patients très vulnérables", u: "%", h: "En plus des vulnérables. Leur supplément d'inscription exige l'attribution par le guichet." },
      { p: "revenu.membreGmf", l: "Membre d'un GMF", t: "check", h: "Forfait de 9,35 $ par patient inscrit vu dans l'année (EP 33, annexe V, code 08875), en cabinet, en CLSC ou en GMF-U. Un GMF-U est un GMF." },
      { p: "revenu.pctPatientsVus", l: "Inscrits vus au moins une fois par année", u: "%", si: "revenu.membreGmf&details", h: "Les nouveaux patients comptent tous. Souvent de 75 à 85 %." },
      { p: "revenu.nouveauxSansMedecin", l: "Nouveaux patients sans médecin, hors guichet", u: "pat.", si: "details", h: "Par exemple, les patients d'un médecin retraité qui a avisé la RAMQ. Ils donnent droit au supplément." },
      { p: "revenu.nouveauxTransferes", l: "Patients transférés, déjà inscrits ailleurs", u: "pat.", si: "details", h: "Pas de supplément." },
      { p: "revenu.semainesArrivee", l: "Arrivée des nouveaux patients étalée sur", u: "sem.", si: "details" },
      { p: "revenu.assiduite80", l: "Taux d'assiduité de 80 % ou plus", t: "check", si: "details", h: "Condition des suppléments au volume : par patient au-delà de 500 inscrits et de 200 vulnérables (EP 40, par. 15.01 et 15.03)." },
      { g: "Frais de cabinet" },
      { p: "revenu.fraisCabinetPct", l: "Part de la facturation remise à la clinique", u: "%", s: 0.5, h: "À l'acte : loyer, personnel, équipement, DMÉ. Souvent de 25 à 35 % en clinique privée." },
      { p: "revenu.fraisCabinetMois", l: "Frais fixes : loyer et autres", u: "$/mois", s: 50, si: "details" },
      { p: "revenu.compensationMode", l: "Compensation des frais de cabinet par la RAMQ", t: "select", o: [["auto", "Calculée selon l'EP 40"], ["manuel", "Montant que j'inscris"]], si: "details",
        h: "En cabinet seulement. Par jour : 32,40 $ à 6 patients inscrits vus, 64,80 $ à 12 (sans rendez-vous : 10 et 20 patients, par. 14.01). DMÉ, dès 150 inscrits : 459,90 $ par trimestre, plus 287,45 $ hors GMF (par. 17.01)." },
      { p: "revenu.compensationCabinet", l: "Compensation des frais de cabinet", u: "$/an", s: 100, si: "revenu.compensationMode=manuel&details", h: "Si votre clinique garde cette compensation, inscrivez 0." },
      { p: "revenu.fraisCabinetTousModes", l: "La clinique les exige aussi au taux horaire et au mixte", t: "check", si: SI_ETAB + "&details", h: "Non en GMF-U situé en CLSC ou à l'hôpital : l'établissement fournit les locaux." },
      { g: "Pour le budget", si: SI_ETAB },
      { p: "revenu.modeBudget", l: "Mode de rémunération utilisé", t: "select", o: [["horaire", "Taux horaire"], ["mixte", "Taux mixte"], ["acte", "À l'acte"]] },
      { g: "Vos visites, hors prise en charge (%)", si: "details" },
      { p: "revenu.mix.suivi", l: "Suivis", u: "%" },
      { p: "revenu.mix.suiviV", l: "Suivis de patients vulnérables", u: "%" },
      { p: "revenu.mix.perioV", l: "Visites périodiques de patients vulnérables", u: "%" },
      { p: "revenu.mix.pedia", l: "Visites périodiques pédiatriques", u: "%" },
      { p: "revenu.mix.gross", l: "Suivis de grossesse", u: "%" },
      { g: "Sans rendez-vous : détails", si: "details&revenu.demiJourneesSRV" },
      { p: "revenu.pctSrvComplexe", l: "Visites ponctuelles complexes", u: "%", h: "Environ 95 % du tarif d'un suivi. Le reste : visites ponctuelles mineures, environ la moitié d'un suivi. Tarifs dans « Tarifs des visites »." },
      { g: "Tarifs des visites (onglet B)", si: "details" },
      { p: "revenu.lieuTarifs", l: "Colonne de tarifs", t: "select", o: [["auto", "Selon la pratique principale"], ["cabinet", "En cabinet : clinique privée, GMF"], ["etablissement", "En établissement : CLSC, GMF-U"]],
        h: "Les visites rapportent plus en cabinet, où le médecin assume ses frais. Un GMF-U situé dans une clinique privée facture en cabinet." },
      ...[["suivi", "Suivi"], ["suiviV", "Suivi, patient vulnérable"], ["perioV", "Visite périodique, patient vulnérable"], ["pedia", "Visite périodique pédiatrique"], ["gross", "Suivi de grossesse"],
        ["pecNonVuln", "Prise en charge, patient non vulnérable"], ["pecVuln", "Prise en charge, patient vulnérable"], ["srvMineure", "Sans rendez-vous : visite ponctuelle mineure"], ["srvComplexe", "Sans rendez-vous : visite ponctuelle complexe"]]
        .flatMap(([k, nom]) => [
          { p: `revenu.tarifs.${k}.0`, l: `${nom} : moins de 500 inscrits`, u: "$", s: 0.05 },
          { p: `revenu.tarifs.${k}.1`, l: `${nom} : 500 inscrits et plus`, u: "$", s: 0.05 },
        ]),
      { g: "Taux horaire (annexe XIV)", si: SI_ETAB + "&details" },
      { p: "revenu.tarifHoraire", l: "Tarif horaire", u: "$/h", s: 0.01 },
      { p: "revenu.heuresMax100", l: "Heures payées à 100 % par année", u: "h", s: 10,
        h: "1 540 heures du 1er juin au 31 mai, puis 71,8 % du tarif. Si votre avis de service prévoit le dépassement autorisé par le chef de département (jusqu'à 880 heures, par. 5.10), inscrivez 2 420." },
      { g: "Taux mixte (annexe XXIII)", si: SI_ETAB + "&details" },
      { p: "revenu.forfaitHoraireMixte", l: "Forfait horaire", u: "$/h", s: 0.01 },
      { p: "revenu.pctMixte", l: "Pourcentage du tarif des visites", u: "%", s: 0.01, h: "63,58 % des services médicaux, en CLSC et en GMF-U (annexe XXIII, sections B-1 et B-2)." },
      { p: "revenu.acteSupervision", l: "Intervention de supervision, tarif à 100 %", u: "$/h", s: 0.01, si: SI_GMFU, h: "24,87 $ par 15 minutes (codes 42096 à 42098)." },
      { p: "revenu.pctSupervision", l: "Part versée de l'intervention de supervision", u: "%", s: 0.01, si: SI_GMFU, h: "62,15 % : services sur base de temps (annexe XXIII, B-2)." },
      { p: "revenu.supervisionMaxH", l: "Heures de supervision payées au plus", u: "h/d.-j.", s: 0.25, si: SI_GMFU, h: "3,5 h l'avant-midi ou le soir ; jusqu'à 5 h l'après-midi." },
      { g: "À l'acte, règles d'avant la Loi 2", si: "details" },
      { p: "revenu.pctActe", l: "Part du tarif des visites payée à l'acte", u: "%", h: "100 % : chaque visite au tarif ci-dessus. En cabinet, si vos tarifs diffèrent, ajustez les tarifs ou ce pourcentage." },
      { g: "Forfaits et suppléments", si: "details" },
      { p: "revenu.forfaitInscription", l: "Forfait annuel d'inscription, par patient", u: "$/pat.", s: 0.01, h: "11,85 $ en cabinet, 8,95 $ en établissement (EP 40, par. 4.01). Ces montants suivent la colonne de tarifs." },
      { p: "revenu.forfaitVulnerable", l: "Forfait annuel, patient vulnérable", u: "$/pat.", s: 0.01, h: "Une catégorie de problèmes de santé : 62,50 $ en cabinet, 47 $ en établissement ; deux catégories : 150 % ; trois ou plus : 200 % (par. 6.01)." },
      { p: "revenu.forfaitTresVulnerable", l: "Forfait annuel, patient très vulnérable", u: "$/pat.", s: 0.01, h: "Plusieurs catégories, à 200 % : 125 $ en cabinet, 94 $ en établissement." },
      { p: "revenu.forfaitGmf", l: "Forfait GMF, par patient vu dans l'année", u: "$/pat.", s: 0.01, si: "revenu.membreGmf", h: "Code 08875 : 9,35 $ (EP 33, annexe V)." },
      { p: "revenu.suppNonVulnerable", l: "Supplément d'inscription, patient non vulnérable sans médecin", u: "$", s: 0.01, h: "Code 19957 : 23,55 $ en cabinet, 19,55 $ en établissement (par. 4.12)." },
      { p: "revenu.suppVulnerableHorsGuichet", l: "Supplément, patient vulnérable hors guichet", u: "$", s: 0.01, h: "Code 19958 : 72,50 $ en cabinet, 60,15 $ en établissement." },
      { p: "revenu.suppVulnerableGuichet", l: "Supplément, patient vulnérable du guichet", u: "$", s: 0.01, h: "Code 19959 : 155,35 $ en cabinet, 128,90 $ en établissement." },
      { p: "revenu.suppTresVulnerable", l: "Supplément, patient très vulnérable du guichet", u: "$", s: 0.01, h: "Code 19960 : 310,65 $ en cabinet, 257,80 $ en établissement (par. 13.01)." },
      { p: "revenu.primeInscription", l: "Prime ponctuelle par nouveau patient inscrit", u: "$", s: 0.01, h: "Selon une entente en vigueur (par exemple 231,75 $ par patient inscrit individuellement lors de l'opération de prise en charge de 2026). 0 sinon." },
      { p: "revenu.perDiemResident", l: "Demi-per diem de supervision, par résident", u: "$", s: 0.01, si: SI_GMFU, h: "Par demi-journée d'au moins 3,5 h (EP 42, par. 5.01 et 5.02) : 41,45 $ en établissement, 55,35 $ en cabinet reconnu ; liste 2 : 65,20 $ et 86,95 $." },
      { p: "revenu.perDiemExterne", l: "Demi-per diem de supervision, par externe", u: "$", s: 0.01, si: SI_GMFU, h: "49,85 $ en établissement, 66,45 $ en cabinet reconnu ; liste 2 : 73,55 $ et 98 $." },
    ],
    impot: [
      { g: "Votre pratique" },
      { p: "impot.structure", l: "Les paiements de la RAMQ sont versés", t: "select", o: [["particulier", "À vous : travail autonome, sans société"], ["societe", "À votre société (pratique incorporée)"]] },
      { g: "Déductions" },
      { p: "impot.depensesProMode", l: "Dépenses professionnelles", t: "select", o: [["total", "Un total"], ["detail", "Le détail, ligne par ligne"]], h: "Collège des médecins, FMOQ, ACPM, formation, équipement… Payées par la société si vous êtes incorporé(e)." },
      { p: "impot.depensesPro", l: "Total des dépenses professionnelles", u: "$/an", s: 100, si: "impot.depensesProMode=total" },
      { p: "epargne.reer.cotisationAnnuelle", l: "Cotisation REER de l'année", u: "$/an", s: 100 },
      { g: "Société" },
      { p: "societe.tauxSociete", l: "Taux d'impôt de la société", u: "%", s: 0.1, h: "9 % fédéral et 11,5 % Québec : une société de médecin a rarement droit à la déduction québécoise pour petite entreprise." },
      { p: "societe.fraisSociete", l: "Frais annuels de la société", u: "$/an", s: 100, h: "Comptable, déclarations, frais juridiques." },
      { p: "societe.retrait", l: "Ce que la société vous verse", t: "select", o: [["tout", "Tout le bénéfice, en dividendes"], ["fixe", "Un montant fixe par année, en dividendes"]], si: "impot.structure=societe" },
      { p: "societe.retraitFixe", l: "Dividendes versés par année", u: "$/an", s: 1000, si: "impot.structure=societe&societe.retrait=fixe", h: "Le reste demeure dans la société et y est placé." },
      { p: "societe.solde", l: "Placements déjà dans la société", u: "$", s: 1000, si: "impot.structure=societe" },
    ],
    menage: [
      { g: "Revenus du ménage" },
      { p: "menage.autresRevenusMensuels", l: "Autres revenus nets du ménage", u: "$/mois", s: 50 },
      { p: "menage.partCommunMoi", l: "Votre part des dépenses partagées", u: "%", h: "Le reste des dépenses partagées est payé par l'autre personne du ménage. Sans partage, laissez 100 %." },
      { g: "Couple" },
      { p: "conjointe.active", l: "Vous vivez en couple", t: "check", h: "Revenus, impôt, dépenses partagées et part de la maison de l'autre personne." },
      { p: "conjointe.lien", l: "Votre union", t: "select", o: [["maries", "Mariés ou en union civile"], ["fait", "Conjoints de fait"]], si: "conjointe.active" },
      { p: "conjointe.depuis12mois", l: "Vie commune depuis au moins 12 mois", t: "check", si: "conjointe.active&conjointe.lien=fait", h: "Pour l'impôt et les allocations, des conjoints de fait forment un couple après 12 mois de vie commune, ou dès qu'ils ont un enfant ensemble. Avant : chacun est imposé comme une personne seule." },
      { p: "conjointe.enfantCommun", l: "Vous avez un enfant ensemble", t: "check", si: "conjointe.active&conjointe.lien=fait" },
      { p: "conjointe.designation", l: "Désigner cette personne comme", t: "select", o: [["partenaire", "Partenaire"], ["conjointe", "Conjointe"], ["conjoint", "Conjoint"]], si: "conjointe.active" },
      { p: "conjointe.statut", l: "Son travail", t: "select", o: [["salarie", "Salarié(e)"], ["autonome", "À son compte : travail autonome, médecin…"], ["sans", "Sans revenu de travail : études, maison, congé"]], si: "conjointe.active" },
      { p: "conjointe.salaire", l: "Son salaire brut", u: "$/an", s: 500, si: "conjointe.active&conjointe.statut=salarie" },
      { p: "conjointe.rpa", l: "Ses cotisations au régime de retraite de l'employeur", u: "$/an", s: 100, si: "conjointe.active&conjointe.statut=salarie" },
      { p: "conjointe.syndicat", l: "Ses cotisations syndicales ou professionnelles", u: "$/an", s: 50, si: "conjointe.active&conjointe.statut=salarie" },
      { p: "conjointe.revenuAutonome", l: "Son revenu brut d'entreprise", u: "$/an", s: 500, si: "conjointe.active&conjointe.statut=autonome", h: "Pour un(e) médecin : paiements de la RAMQ et autres honoraires." },
      { p: "conjointe.depensesAutonome", l: "Ses dépenses d'entreprise déductibles", u: "$/an", s: 100, si: "conjointe.active&conjointe.statut=autonome" },
      { p: "conjointe.autresRevenus", l: "Ses autres revenus imposables", u: "$/an", s: 100, si: "conjointe.active" },
      { p: "conjointe.medicamentsPublic", l: "Son assurance médicaments : régime public", t: "check", si: "conjointe.active", h: "La prime se paie avec l'impôt du Québec. Décochez en cas d'assurance collective au travail." },
      { p: "conjointe.partMaison", l: "Sa part de propriété de la maison", u: "%", si: "conjointe.active&actifs.logement=proprietaire" },
      { p: "conjointe.epargne", l: "Son épargne : REER, CELI, comptes", u: "$", s: 100, si: "conjointe.active" },
      { p: "conjointe.epargneMensuelle", l: "Son épargne chaque mois", u: "$/mois", s: 50, si: "conjointe.active", h: "REER, CELI ou autre ; comptée dans la valeur nette du couple et retirée de son surplus." },
      { p: "conjointe.voiture", l: "Valeur de son auto", u: "$", s: 500, si: "conjointe.active" },
      { g: "Famille" },
      { p: "famille.calculAuto", l: "Calculer les allocations familiales selon vos revenus", t: "check", h: "Allocation canadienne pour enfants, Allocation famille et supplément pour fournitures scolaires. Les enfants et leur âge viennent de la page Avenir." },
      { p: "menage.allocationsAnnuelles", l: "Allocations familiales reçues", u: "$/an", s: 50, si: "!famille.calculAuto" },
      { p: "famille.versementA", l: "Allocations versées à", t: "select", o: [["moi", "Vous"], ["conjointe", () => Pn()]], si: "conjointe.active" },
      { p: "famille.medicamentsPublicMoi", l: "Votre assurance médicaments : régime public", t: "check", h: "La prime se paie avec l'impôt du Québec. Décochez si vous avez une assurance collective." },
    ],
    strategie: [
      { g: "Stratégie de remboursement" },
      { p: "strategie.methode", l: "Méthode", t: "select", o: [["avalanche", "Avalanche : taux réel le plus élevé d'abord"], ["hybride", "Hybride : droit annuel des hypothèques, puis avalanche"], ["boule", "Boule de neige : plus petit solde d'abord"], ["minimum", "Paiements minimums seulement"]] },
      { p: "strategie.extraMode", l: "Montant en plus chaque mois", t: "select", o: [["auto", "Votre surplus du budget"], ["manuel", "Un montant fixe"]] },
      { p: "strategie.extraManuel", l: "Montant fixe en plus", u: "$/mois", s: 50 },
      { p: "strategie.reerSurDettes", l: "Verser le remboursement d'impôt du REER sur les dettes chaque avril", t: "check" },
      { p: "strategie.debut", l: "Début de la simulation", t: "month" },
    ],
    epargne: [
      { g: "Placements" },
      { p: "epargne.reee.cotisationAnnuelle", l: "Cotisation REEE par enfant", u: "$/an", s: 50, h: "2 500 $ par enfant donnent le maximum de subventions : 30 %." },
      { p: "epargne.reer.solde", l: "Solde REER", u: "$", s: 100 },
      { p: "epargne.reer.droits", l: "Droits de cotisation REER inutilisés", u: "$", s: 100, h: "Sur votre avis de cotisation fédéral." },
      { p: "epargne.reer.cotisationAnnuelle", l: "Cotisation REER par année", u: "$/an", s: 100 },
      { p: "epargne.celi.solde", l: "Solde CELI", u: "$", s: 100 },
      { p: "epargne.celi.cotisationAnnuelle", l: "Cotisation CELI par année", u: "$/an", s: 100 },
      { p: "epargne.celiapp.solde", l: "Solde CELIAPP", u: "$", s: 100, h: "Compte d'épargne libre d'impôt pour l'achat d'une première propriété." },
      { p: "epargne.celiapp.cotisationAnnuelle", l: "Cotisation CELIAPP par année", u: "$/an", s: 100, h: "8 000 $ par année au plus, 40 000 $ à vie ; déductible comme un REER ; retrait sans impôt pour acheter une première propriété." },
      { p: "epargne.encaisse", l: "Comptes et encaisse", u: "$", s: 100 },
      { p: "epargne.frais", l: "Frais de gestion de vos placements (RFG)", u: "%", s: 0.05, h: "Sur vos relevés ou le document « Aperçu du fonds ». 0 : non précisé." },
      { p: "epargne.tauxRetrait", l: "Taux d'imposition prévu au retrait du REER", u: "%", s: 1, h: "Pour comparer le REER au CELI : s'il est plus bas que votre taux marginal d'aujourd'hui, le REER rapporte plus." },
      { g: "Répartition des placements" },
      { p: "epargne.profil", l: "Profil de placement", t: "select", o: [["prudent", "Prudent : 40 % d'actions"], ["equilibre", "Équilibré : 60 % d'actions"], ["croissance", "Croissance : 80 % d'actions"], ["personnalise", "Personnalisé"]],
        h: "Selon votre horizon et les baisses que vous tolérez. Le rendement du scénario réaliste (5 %) correspond à un portefeuille équilibré." },
      { p: "epargne.pctActionsCible", l: "Part visée en actions", u: "%", si: "epargne.profil=personnalise" },
      { p: "epargne.pctActionsActuel", l: "Part actuelle en actions", u: "%", h: "Sur vos relevés : actions et fonds d'actions, tous comptes confondus." },
      { g: "Biens" },
      { p: "actifs.logement", l: "Votre logement", t: "select", o: [["proprietaire", "Propriétaire"], ["locataire", "Locataire"]], h: "Locataire : le loyer va au budget (Logement) ; aucune maison dans la valeur nette." },
      { p: "actifs.maison.valeur", l: "Valeur de la maison", u: "$", s: 1000, si: "actifs.logement=proprietaire" },
      { p: "actifs.maison.part", l: "Votre part de propriété", u: "%", si: "actifs.logement=proprietaire" },
      { p: "actifs.voiture.valeur", l: "Valeur de votre auto", u: "$", s: 100, h: "Rendement, hausse de la valeur de la maison et perte de valeur des autos : bouton Hypothèses." },
      { p: "actifs.voiture.remplacementAns", l: "Remplacer les autos tous les", u: "ans", s: 1, h: "0 : jamais. Chaque auto est échangée à sa valeur ; la différence sort de l'épargne." },
      { p: "actifs.voiture.prixNeuf", l: "Prix d'une auto neuve, en dollars d'aujourd'hui", u: "$", s: 1000 },
    ],
    hypotheses: [
      { g: "Affichage" },
      { p: "scenarios.dollarsAujourdhui", l: "Montrer l'avenir en dollars d'aujourd'hui", t: "check", h: "Retire l'inflation du scénario choisi : 100 000 $ dans 10 ans valent moins que 100 000 $ aujourd'hui." },
      ...Object.entries({ prudent: "Prudent", realiste: "Réaliste", optimiste: "Optimiste" }).flatMap(([k, nom]) => [
        { g: "Scénario " + nom.toLowerCase() + (k === "realiste" ? " · normes 2026" : "") },
        { p: `scenarios.${k}.rendement`, l: "Rendement des placements, après frais", u: "%/an", s: 0.1 },
        { p: `scenarios.${k}.croissanceMaison`, l: "Hausse de la valeur de la maison", u: "%/an", s: 0.1 },
        { p: `scenarios.${k}.depreciationAuto`, l: "Perte de valeur des autos", u: "%/an", s: 1 },
        { p: `scenarios.${k}.ecartTaux`, l: "Écart de taux : marge et renouvellements", u: "points", s: 0.25, neg: true },
        { p: `scenarios.${k}.inflation`, l: "Hausse des dépenses (inflation)", u: "%/an", s: 0.1 },
        { p: `scenarios.${k}.hausseRevenus`, l: "Hausse des revenus", u: "%/an", s: 0.1 },
      ]),
      { g: "Probabilité de réussite" },
      { p: "scenarios.volatilite", l: "Variation des rendements d'une année à l'autre (écart type)", u: "%", s: 1, h: "10 % : portefeuille équilibré ; 15 % : surtout des actions ; 5 % : prudent." },
    ],
  });

  window.WM = window.WM || {};
  window.WM.catalogues = {
    EXEMPLE, nouvelId, CATALOGUE, CATALOGUE_REVENUS, ITEMS_REVENUS, normaliserLignes, annuelLigne, estPro, nomLigne,
    CATALOGUE_PRO, ITEMS_PRO, normaliserPro, ITEMS, AIDE_CATEGORIE, normaliserBudget, nomDepense, categorie,
    VERIFICATION, MILIEUX, ACTIVITES, nomActivite, champs,
  };
})();
