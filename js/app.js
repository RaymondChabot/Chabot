/* WealthMorand — interface. L'état vit dans le localStorage de ce navigateur ;
   aucune donnée ne quitte l'appareil. Les calculs sont dans calc.js. */
(function () {
  "use strict";
  const C = window.Calc;
  const CLE = "boussole.v1";
  const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];

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
      semainesArrivee: 38, partVulnerable: 20, assiduite80: true, anneePratique: "5", membreGmf: true, pctPatientsVus: 80,
      mix: { suivi: 70, suiviV: 15, perioV: 5, pedia: 5, gross: 5 },
      // Taux horaire, mixte et supervision (Brochure no 1) ; forfaits, suppléments et demi-per diem de la colonne cabinet.
      ...C.RAMQ, ...C.montantsLieu("cabinet", 1), listeEnseignement: "1",
      pctActe: 100,
      fraisCabinetPct: 30, fraisCabinetMois: 0, compensationCabinet: 0, fraisCabinetTousModes: false,
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
  // Dépenses prises en compte : les lignes, sauf dans les catégories où l'on a choisi un total.
  const totalActif = g => S.budgetTotaux && S.budgetTotaux[g] && S.budgetTotaux[g].actif;
  const depensesEffectives = () => [
    ...S.budget.filter(b => !totalActif(categorie(b))),
    ...Object.entries(S.budgetTotaux || {}).filter(([, t]) => t.actif).map(([g, t]) => ({ id: "total-" + g, k: null, cat: g, nom: g + " (total)", montant: +t.montant || 0, periode: "mois", qui: t.qui || "moi" })),
  ];

  /* Résultats de l'outil de calcul du revenu disponible du ministère des Finances du
     Québec (version de mai 2026, revenus d'emploi), relevés le 25 octobre 2026.
     WealthMorand recalcule les mêmes cas à chaque ouverture pour mesurer l'écart. */
  const VERIFICATION = [{"couple": true, "salaires": [190000, 60000], "ages": [4, 3], "officiel": {"qc": 40789, "fed": 34389, "rrq": 8455, "rqap": 701, "ae": 1676, "af": 2442, "fournitures": 127, "ace": 860, "prime": 1532}}, {"couple": true, "salaires": [100000, 0], "ages": [4, 3], "officiel": {"qc": 10487, "fed": 9131, "rrq": 4895, "rqap": 430, "ae": 896, "af": 4655, "fournitures": 127, "ace": 9378, "prime": 1532}}, {"couple": false, "salaires": [190000], "ages": [], "officiel": {"qc": 35143, "fed": 29962, "rrq": 4895, "rqap": 443, "ae": 896, "af": 0, "fournitures": 0, "ace": 0, "prime": 766}}, {"couple": true, "salaires": [80000, 40000], "ages": [4, 3], "officiel": {"qc": 12070, "fed": 9862, "rrq": 6995, "rqap": 516, "ae": 1416, "af": 3920, "fournitures": 127, "ace": 8248, "prime": 1532}}, {"couple": true, "salaires": [250000, 0], "ages": [4, 3], "officiel": {"qc": 47939, "fed": 42881, "rrq": 4895, "rqap": 443, "ae": 896, "af": 2442, "fournitures": 127, "ace": 828, "prime": 1532}}, {"couple": true, "salaires": [190000, 15000], "ages": [4, 3], "officiel": {"qc": 34447, "fed": 29797, "rrq": 5620, "rqap": 507, "ae": 1091, "af": 2442, "fournitures": 127, "ace": 3400, "prime": 1532}}, {"couple": false, "salaires": [60000], "ages": [], "officiel": {"qc": 5647, "fed": 4427, "rrq": 3560, "rqap": 258, "ae": 780, "af": 0, "fournitures": 0, "ace": 0, "prime": 766}}, {"couple": true, "salaires": [140000, 90000], "ages": [7, 3], "officiel": {"qc": 33507, "fed": 28249, "rrq": 9791, "rqap": 830, "ae": 1791, "af": 2442, "fournitures": 127, "ace": 758, "prime": 1532}}];

  /* ---------- État ---------- */
  const clone = o => JSON.parse(JSON.stringify(o));
  function fusion(base, x) {
    if (Array.isArray(base)) return Array.isArray(x) ? x : base;
    if (base && typeof base === "object") {
      const o = { ...base };
      if (x && typeof x === "object" && !Array.isArray(x)) for (const k of Object.keys(x)) o[k] = k in base ? fusion(base[k], x[k]) : x[k];
      return o;
    }
    return x === undefined || x === null ? base : x;
  }
  // Fichiers et états d'avant le choix du milieu, les activités et le logement : on garde
  // leur sens d'origine (GMF-U, aucune activité ni SRV, propriétaire s'il y a une maison)
  // plutôt que de prendre les valeurs du nouvel exemple.
  function migrer(d) {
    if (!d || typeof d !== "object") return d;
    if (d.revenu) {
      if (!["clinique", "gmfu", "clsc"].includes(d.revenu.milieu)) d.revenu.milieu = d.revenu.milieu ? "clinique" : "gmfu";
      d.revenu.demiJourneesSRV ??= 0; d.revenu.patientsSRV ??= 0; d.revenu.activites ??= [];
      if (!d.revenu.lignes && d.revenu.autresRevenus > 0) d.revenu.lignes = [{ k: "ramq", montant: d.revenu.autresRevenus, periode: "an" }];
      if (d.revenu.lignes) d.revenu.autresRevenus = 0;
      // Sans rendez-vous : plus de supplément par demi-journée.
      delete d.revenu.suppSRV10; delete d.revenu.suppSRV20;
      // Brochure no 1 : la limite de 150 patients du guichet après 4 ans (ancien par. 13.02 de l'EP 40) est abolie
      // depuis le 1er janvier 2023, et l'intervention de supervision n'existe qu'au mixte. Les anciennes valeurs
      // de départ du mixte et de la supervision deviennent celles de la brochure.
      delete d.revenu.quatrePremieresAnnees; delete d.revenu.pctSupervisionActe;
      for (const [k, ancien] of [["pctMixte", 60], ["acteSupervision", 114.2], ["pctSupervision", 60]]) if (+d.revenu[k] === ancien) d.revenu[k] = C.RAMQ[k];
      // Forfait GMF (EP 33) : décoché dans les données d'avant, jusqu'à ce qu'on le confirme.
      d.revenu.membreGmf ??= false;
      // Tarifs enregistrés avant les deux colonnes (cabinet, établissement) : s'ils sont ceux de départ
      // (anciens tarifs du sans rendez-vous compris), ils suivent désormais la colonne de la pratique.
      const t = d.revenu.tarifs;
      if (t && d.revenu.tarifsModifies === undefined) {
        const E = C.TARIFS_LIEU.etablissement, srvAnciens = ["32.25,36.95", "40.5,45.2", "15.35,17.7", "30.7,35.35"];
        d.revenu.tarifsModifies = Object.keys(t).some(k => String(t[k]) !== String(E[k]) && !(k.startsWith("srv") && srvAnciens.includes(String(t[k]))));
        if (!d.revenu.tarifsModifies && !d.revenu.pctSrvComplexe) d.revenu.pctSrvComplexe = 50;
      }
    }
    if (d.actifs && !d.actifs.logement) d.actifs.logement = d.actifs.maison && d.actifs.maison.valeur > 0 ? "proprietaire" : "locataire";
    return d;
  }
  function charger() {
    try { const t = localStorage.getItem(CLE); if (t) return fusion(clone(EXEMPLE), migrer(JSON.parse(t))); } catch (e) { /* stockage indisponible */ }
    return clone(EXEMPLE);
  }
  // Une case par poste des catalogues : budget, autres revenus, dépenses professionnelles.
  // Colonne de tarifs de la RAMQ : en cabinet (clinique privée, GMF) ou en établissement (CLSC, GMF-U).
  // Valeurs de départ de l'app d'avant la Brochure no 1 : remplacées comme celles de la RAMQ.
  const ANCIENS_MONTANTS = { forfaitInscription: [10], forfaitVulnerable: [55], forfaitTresVulnerable: [55], suppNonVulnerable: [18.9],
    suppVulnerableHorsGuichet: [58.1], suppVulnerableGuichet: [124.5], suppTresVulnerable: [124.5], perDiemResident: [39.65], perDiemExterne: [0] };
  // Tant qu'on ne les a pas modifiés, les tarifs des visites suivent la colonne de la pratique, et les forfaits,
  // suppléments et demi-per diem, sa colonne et la liste de l'EP 42. « tous » rétablit aussi le taux horaire et le mixte.
  function synchroniserTarifs(s, tous) {
    const r = s.revenu, lieu = C.lieuTarifs(r);
    if (tous) { r.tarifsModifies = false; for (const k of ["tarifHoraire", "forfaitHoraireMixte", "pctMixte", "acteSupervision", "pctSupervision", "forfaitGmf"]) r[k] = C.RAMQ[k]; }
    if (!r.tarifsModifies) r.tarifs = clone(C.TARIFS_LIEU[lieu]);
    const cible = C.montantsLieu(lieu, r.listeEnseignement);
    const connus = k => [...["cabinet", "etablissement"].flatMap(l => [1, 2].map(n => C.montantsLieu(l, n)[k])), ...(ANCIENS_MONTANTS[k] || [])];
    for (const k of Object.keys(cible)) if (tous || r[k] == null || connus(k).includes(+r[k])) r[k] = cible[k];
    return s;
  }
  function normaliser(s) {
    s.budget = normaliserBudget(s.budget);
    s.revenu.lignes = normaliserLignes(s.revenu.lignes);
    s.impot.depensesProDetail = normaliserPro(s.impot.depensesProDetail);
    s.plans = (s.plans || []).map(pl => ({ ...pl, donnees: normaliser(fusion(clone(EXEMPLE), migrer(pl.donnees))) }));
    return synchroniserTarifs(s);
  }
  let S = normaliser(charger());
  // En modifiant un plan B, S est ce plan ; « principal » garde votre plan, enregistré avec ses plans.
  let principal = null, planActif = null;
  function sauver() {
    const r = principal || S;
    S.meta.misAJour = r.meta.misAJour = new Date().toISOString();
    try { localStorage.setItem(CLE, JSON.stringify(r)); } catch (e) { /* le calcul fonctionne quand même */ }
  }
  const lire = p => p.split(".").reduce((o, k) => (o == null ? o : o[k]), S);
  const ecrire = (p, v) => { const k = p.split("."); let o = S; for (let i = 0; i < k.length - 1; i++) o = o[k[i]] ?? (o[k[i]] = {}); o[k[k.length - 1]] = v; };
  // Déclarée comme fonction : le chargement s'en sert (lignes sans identifiant) avant d'arriver ici.
  function nouvelId(p) { return p + Math.random().toString(36).slice(2, 8); }

  /* ---------- Formats ---------- */
  const fmt$ = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
  const fmt$2 = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const $ = v => fmt$.format(isFinite(v) ? v : 0);
  const $2 = v => fmt$2.format(isFinite(v) ? v : 0);
  const nb = (v, d = 1) => new Intl.NumberFormat("fr-CA", { maximumFractionDigits: d }).format(isFinite(v) ? v : 0);
  const pct = (v, d = 1) => nb(v * 100, d) + " %";
  const signe = v => (v >= 0 ? "+" : "−") + $(Math.abs(v));
  const k$ = v => nb(v / 1000, 0) + " k$";
  // Désignation de la personne avec qui vit le médecin : partenaire, conjointe ou conjoint.
  const pn = () => ({ partenaire: "partenaire", conjointe: "conjointe", conjoint: "conjoint" })[S.conjointe.designation] || "partenaire";
  const Pn = () => pn().charAt(0).toUpperCase() + pn().slice(1);
  const votreP = () => "votre " + pn();
  const texteDe = x => typeof x === "function" ? x() : x;
  const moisAn = d => d ? d.toLocaleDateString("fr-CA", { month: "long", year: "numeric" }) : "jamais";
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };

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
     CHAMPS : chaque entrée décrit un champ lié à un chemin de l'état
     ============================================================ */
  const CHAMPS = {
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
      { p: "revenu.partVulnerable", l: "Patients vulnérables", u: "%", h: "Forfait annuel plus élevé, versé par la RAMQ en 4 paiements." },
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
      { p: "revenu.compensationCabinet", l: "Compensation des frais de cabinet par la RAMQ", u: "$/an", s: 100, si: "details",
        h: "En cabinet (EP 40) : 32,40 $ par jour où vous voyez au moins 6 patients inscrits, 64,80 $ à 12 ou plus (sans rendez-vous : 10 et 20 patients, par. 14.01) ; DMÉ, jusqu'à 459,90 $ par trimestre pour les licences (par. 17.01)." },
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
  };

  /* ============================================================
     CHAMPS DE SAISIE : ils vivent dans le panneau « Modifier »
     ============================================================ */
  // Un champ : libellé, puis saisie (nombre, liste, mois, date) ou interrupteur.
  function creerChamp(c, id, lier, confirmable) {
    const ligne = el("div", "champ" + (c.t === "check" ? " case" : c.t === "select" || c.t === "month" || c.t === "date" ? " large" : ""));
    if (c.si) ligne.dataset.si = c.si;
    const lab = el("label", null, texteDe(c.l)); lab.htmlFor = id;
    let inp;
    if (c.t === "check") {
      inp = el("input", "interrupteur"); inp.type = "checkbox"; inp.setAttribute("role", "switch");
      ligne.append(lab, inp);
    } else {
      const boite = el("div", "saisie");
      if (c.t === "select") {
        inp = el("select");
        for (const [v, t] of c.o) { const o = el("option", null, texteDe(t)); o.value = v; inp.appendChild(o); }
      } else {
        inp = el("input"); inp.type = c.t === "month" || c.t === "date" ? c.t : "number";
        if (inp.type === "number") { inp.step = c.s || 1; inp.inputMode = "decimal"; if (c.neg) { inp.dataset.neg = "1"; inp.inputMode = "text"; } else inp.min = "0"; }
      }
      boite.appendChild(inp);
      if (c.u) boite.appendChild(el("span", "unite", c.u));
      ligne.append(lab, boite);
    }
    inp.id = id; lier(inp);
    if (confirmable) {
      const b = el("button", "conf", "✓"); b.type = "button"; b.dataset.conf = c.p;
      b.title = "Valeur confirmée par un document"; b.setAttribute("aria-label", "Confirmée : " + texteDe(c.l));
      ligne.appendChild(b);
    } else ligne.appendChild(el("span"));
    if (c.h) ligne.appendChild(el("p", "aide", c.h));
    return ligne;
  }
  function construireChamps(conteneur, champs) {
    let groupe = null;
    for (const c of champs) {
      if (c.g) {
        groupe = el("div", "groupe");
        if (c.si) groupe.dataset.si = c.si;
        groupe.appendChild(el("h3", null, c.g));
        conteneur.appendChild(groupe);
        continue;
      }
      const id = "c-" + c.p.replace(/\./g, "-");
      (groupe || conteneur).appendChild(creerChamp(c, id, inp => { inp.dataset.p = c.p; }, true));
    }
  }
  function remplirChamps() {
    document.querySelectorAll("[data-p]").forEach(inp => {
      const v = lire(inp.dataset.p);
      if (inp.type === "checkbox") inp.checked = !!v; else inp.value = v ?? "";
    });
    document.querySelectorAll("[data-conf]").forEach(b => b.setAttribute("aria-pressed", S.confirmes[b.dataset.conf] ? "true" : "false"));
    majVisibilite();
  }
  // Champs qui ne s'affichent que selon un autre champ (« !chemin » pour l'inverse).
  function majVisibilite() {
    const vrai = cond => {
      if (cond === "details") return detailsAffiches();
      const neg = cond.startsWith("!"), [chemin, attendu] = cond.replace("!", "").split("=");
      const v = attendu === undefined ? !!lire(chemin) : attendu.split("|").includes(String(lire(chemin)));
      return neg ? !v : v;
    };
    // « chemin=valeur » compare (« a|b » : l'une ou l'autre valeur) ; « !chemin » inverse ;
    // « & » : toutes les conditions ; « , » : l'un ou l'autre des groupes de conditions.
    document.querySelectorAll("[data-si]").forEach(l => { l.hidden = !l.dataset.si.split(",").some(gr => gr.split("&").every(vrai)); });
  }
  // Champ d'une liste (dépense, dette, enfant) : lié par data-l, data-i et data-k.
  const lierListe = (liste, i, k) => inp => { inp.dataset.l = liste; inp.dataset.i = i; inp.dataset.k = k; };
  const tableau = nom => nom === "enfants" ? S.epargne.reee.enfants : nom === "activites" ? S.revenu.activites : nom === "lignes" ? S.revenu.lignes
    : nom === "depensesPro" ? S.impot.depensesProDetail : nom === "actifsAutres" ? (S.actifs.autres = S.actifs.autres || []) : nom === "objectifs" ? (S.objectifs = S.objectifs || [])
    : nom === "jalonsPerso" ? (S.jalonsPerso = S.jalonsPerso || []) : nom === "plans" ? (racine().plans = racine().plans || []) : nom === "bilans" ? (S.bilans = S.bilans || []) : S[nom];
  // Essentiel ou tous les détails (Optimiser) : préférence de cet appareil.
  const detailsAffiches = () => { try { return localStorage.getItem("wm.details") === "1"; } catch (e) { return false; } };
  function boutonDetails(c) {
    const b = el("button", "bouton secondaire bouton-details"); b.type = "button";
    const maj = () => { const d = detailsAffiches(); b.textContent = d ? "Afficher l'essentiel seulement" : "Optimiser : afficher tous les détails"; b.setAttribute("aria-pressed", d ? "true" : "false"); };
    b.addEventListener("click", () => { try { localStorage.setItem("wm.details", detailsAffiches() ? "0" : "1"); } catch (e) { /* préférence non gardée */ } maj(); majVisibilite(); });
    maj(); c.appendChild(b);
  }

  /* ============================================================
     PANNEAU « MODIFIER » : glisse du bas (téléphone) ou de la droite
     ============================================================ */
  const feuille = document.getElementById("feuille"), corps = document.getElementById("feuille-corps"), titreFeuille = document.getElementById("feuille-titre");
  let feuilleCourante = null;
  function ouvrirFeuille(titre, construire) {
    feuilleCourante = { titre, construire, maj: null };
    titreFeuille.textContent = titre; corps.textContent = "";
    construire(corps); remplirChamps();
    if (!feuille.open) feuille.showModal();
    corps.scrollTop = 0;
  }
  // Reconstruit le panneau ouvert (après un ajout, une suppression ou un changement de type).
  function reconstruireFeuille() {
    if (!feuilleCourante || !feuille.open) return;
    const y = corps.scrollTop;
    corps.textContent = ""; feuilleCourante.construire(corps); remplirChamps();
    corps.scrollTop = y;
  }
  feuille.addEventListener("close", () => {
    feuilleCourante = null; corps.textContent = ""; tout();
    if (boiteToast.parentNode !== document.body) document.body.appendChild(boiteToast);
  });
  feuille.addEventListener("click", e => { if (e.target === feuille) feuille.close(); });
  document.getElementById("feuille-fermer").addEventListener("click", () => feuille.close());

  const FEUILLES = {
    revenu: ["Revenu", CHAMPS.revenu],
    impot: ["Impôt", CHAMPS.impot],
    menage: ["Ménage et couple", CHAMPS.menage],
    strategie: ["Plan de remboursement", CHAMPS.strategie],
    epargne: ["Épargne et biens", CHAMPS.epargne],
    hypotheses: ["Hypothèses de l'avenir", CHAMPS.hypotheses],
  };
  function ouvrirSection(nom) {
    const [titre, champs] = FEUILLES[nom];
    if (nom === "revenu") voir("revenu");
    ouvrirFeuille(titre, c => {
      if (nom === "revenu") {
        c.appendChild(el("p", "aide feuille-intro", "L'essentiel suffit pour commencer. Pour optimiser, affichez tous les détails : tarifs, forfaits, suppléments, apprenants, majoration selon le territoire."));
        boutonDetails(c);
      }
      construireChamps(c, champs);
      if (nom === "impot") {
        const a = el("div", "actions"); a.dataset.si = "impot.depensesProMode=detail";
        const b = el("button", "bouton secondaire", "Détailler les dépenses professionnelles"); b.type = "button"; b.addEventListener("click", feuilleDepensesPro);
        a.appendChild(b); c.querySelector(".groupe:nth-of-type(2)") ? c.querySelectorAll(".groupe")[1].appendChild(a) : c.appendChild(a);
      }
      if (nom !== "revenu") return;
      // Tarifs modifiés : on peut revenir à ceux de la RAMQ (colonne de la pratique).
      const gTarifs = [...c.querySelectorAll(".groupe")].find(g => g.firstChild.textContent.startsWith("Tarifs des visites"));
      if (gTarifs) {
        const a = el("div", "actions"), b = el("button", "bouton secondaire", "Rétablir les tarifs de la RAMQ"); b.type = "button";
        b.addEventListener("click", () => { synchroniserTarifs(S, true); sauver(); remplirChamps(); tout(); toast("Tarifs, forfaits et suppléments de la RAMQ rétablis."); });
        a.appendChild(b); gTarifs.appendChild(a);
      }
      // Total des types de visites, qui doit faire 100 %.
      const groupe = [...c.querySelectorAll(".groupe")].find(g => g.firstChild.textContent.startsWith("Vos visites"));
      if (!groupe) return;
      const total = el("p", "aide"); groupe.appendChild(total);
      feuilleCourante.maj = () => {
        const s = Object.values(S.revenu.mix).reduce((a, x) => a + (+x || 0), 0);
        total.textContent = `Total : ${nb(s)} %` + (Math.abs(s - 100) > 0.5 ? " : le calcul le ramène à 100 %." : "");
        total.classList.toggle("avertissement", Math.abs(s - 100) > 0.5);
      };
      feuilleCourante.maj();
    });
  }

  // Une catégorie de dépenses : une ligne par dépense du catalogue.
  function feuilleCategorie(g) { ouvrirFeuille(g, c => construireCategorie(c, g)); }
  function construireCategorie(c, g) {
    const total = el("div", "feuille-total"); c.appendChild(total);
    feuilleCourante.maj = () => {
      const t = totalActif(g) ? +S.budgetTotaux[g].montant || 0 : S.budget.filter(b => categorie(b) === g).reduce((a, b) => a + mensuel(b), 0);
      total.textContent = ""; total.append(el("span", null, "Total par mois"), el("strong", null, $(t)));
    };
    feuilleCourante.maj();
    // Un seul total estimé, ou le détail ligne par ligne (on peut passer de l'un à l'autre).
    if (g !== "Autres dépenses") {
      const choix = el("div", "segment petit"); choix.id = "cat-mode"; c.appendChild(choix);
      segment("cat-mode", [["detail", "Ligne par ligne"], ["total", "Un total estimé"]], totalActif(g) ? "total" : "detail", v => {
        S.budgetTotaux = S.budgetTotaux || {};
        const t = S.budgetTotaux[g] || { montant: Math.round(S.budget.filter(b => categorie(b) === g).reduce((a, b) => a + mensuel(b), 0)), qui: "moi" };
        S.budgetTotaux[g] = { ...t, actif: v === "total" }; S.meta.exemple = false;
        sauver(); reconstruireFeuille(); tout();
      }, "Total ou détail");
      if (totalActif(g)) {
        const gr = el("div", "groupe");
        gr.appendChild(creerChamp({ l: "Total par mois", u: "$/mois", s: 10 }, "cat-total", inp => { inp.dataset.p = `budgetTotaux.${g}.montant`; }, false));
        gr.appendChild(creerChamp({ l: "Qui paie", t: "select", o: [["moi", "Moi"], ["commun", "Partagée"], ["conjoint", S.conjointe.active ? Pn() : "Autre"]] }, "cat-qui", inp => { inp.dataset.p = `budgetTotaux.${g}.qui`; }, false));
        c.appendChild(gr);
        c.appendChild(el("p", "aide", "Les lignes de cette catégorie sont mises de côté tant que vous utilisez un total. Revenez à « Ligne par ligne » pour les détailler."));
        return;
      }
    }
    c.appendChild(el("p", "aide", "Montant, période et qui paie. « Partagée » suit votre part des dépenses partagées (bouton Ménage du budget)." + (AIDE_CATEGORIE[g] ? " " + AIDE_CATEGORIE[g] : "")));
    S.budget.forEach((b, i) => { if (categorie(b) === g) c.appendChild(ligneDepense(b, i)); });
    if (g === "Autres dépenses") {
      const a = el("div", "feuille-actions");
      const bt = el("button", "bouton secondaire large", "Ajouter une dépense"); bt.type = "button";
      bt.addEventListener("click", () => {
        S.budget.push({ id: nouvelId("b"), k: null, nom: "Nouvelle dépense", montant: 0, periode: "mois", qui: "moi" });
        sauver(); reconstruireFeuille(); tout();
        const champs = corps.querySelectorAll('input[data-k="nom"]'); if (champs.length) { champs[champs.length - 1].focus(); champs[champs.length - 1].select(); }
      });
      a.appendChild(bt); c.appendChild(a);
    }
  }
  function ligneDepense(b, i) {
    const l = el("div", "ligne-depense" + (b.montant > 0 ? " remplie" : ""));
    let nom;
    if (b.k) { nom = el("label", null, nomDepense(b)); nom.htmlFor = `bu-${b.id}-montant`; }
    else { nom = el("input"); nom.type = "text"; nom.value = b.nom; nom.setAttribute("aria-label", "Nom de la dépense"); lierListe("budget", i, "nom")(nom); }
    const boiteM = el("div", "saisie");
    const mnt = el("input"); mnt.type = "number"; mnt.step = "1"; mnt.min = "0"; mnt.inputMode = "decimal"; mnt.value = b.montant || ""; mnt.placeholder = "0";
    mnt.id = `bu-${b.id}-montant`; lierListe("budget", i, "montant")(mnt);
    if (!b.k) mnt.setAttribute("aria-label", "Montant : " + b.nom);
    boiteM.append(mnt, el("span", "unite", "$"));
    const boiteP = el("div", "saisie");
    const per = el("select"); [["mois", "/ mois"], ["an", "/ an"]].forEach(([v, t]) => { const o = el("option", null, t); o.value = v; per.appendChild(o); });
    per.value = b.periode; per.setAttribute("aria-label", "Période : " + nomDepense(b)); lierListe("budget", i, "periode")(per);
    boiteP.appendChild(per);
    const boiteQ = el("div", "saisie");
    const qui = el("select"); [["moi", "Moi"], ["commun", "Partagée"], ["conjoint", S.conjointe.active ? Pn() : "Autre"]].forEach(([v, t]) => { const o = el("option", null, t); o.value = v; qui.appendChild(o); });
    qui.value = b.qui; qui.setAttribute("aria-label", "Qui paie : " + nomDepense(b)); lierListe("budget", i, "qui")(qui);
    boiteQ.appendChild(qui);
    l.append(nom, boiteM, boiteP, boiteQ);
    if (!b.k) { const x = el("button", "supprimer", "×"); x.type = "button"; x.setAttribute("aria-label", "Supprimer : " + b.nom); x.dataset.suppr = "budget"; x.dataset.i = i; l.appendChild(x); }
    else l.appendChild(el("span"));
    return l;
  }

  const CHAMPS_DETTE = [
    { k: "type", l: "Type", t: "select", o: [["marge", "Marge de crédit"], ["hypotheque", "Hypothèque"], ["pret", "Prêt"], ["autre", "Autre"]] },
    { k: "solde", l: "Solde", u: "$", s: 100 },
    { k: "taux", l: "Taux", u: "%", s: 0.01 },
    { k: "interetsSeulement", l: "Intérêts seulement chaque mois", t: "check" },
    { k: "paiement", l: "Paiement", u: "$", s: 0.01, sauf: d => d.interetsSeulement },
    { k: "frequence", l: "Fréquence des paiements", t: "select", o: [["mois", "Chaque mois"], ["2sem", "Aux 2 semaines"]], sauf: d => d.interetsSeulement },
    { k: "limite", l: "Limite de crédit", u: "$", s: 100, seul: "marge" },
    { k: "finTerme", l: "Fin du terme", t: "date", seul: "hypotheque" },
    { k: "tauxRenouvellement", l: "Taux au renouvellement", u: "%", s: 0.01, seul: "hypotheque" },
    { k: "dureeTerme", l: "Durée des termes suivants", u: "ans", s: 1, seul: "hypotheque" },
    { k: "privilege", l: "Remboursement anticipé permis", u: "%/an", s: 1, seul: "hypotheque" },
    { k: "creditImpot", l: "Crédit d'impôt sur les intérêts", u: "%", s: 1, h: "34 % pour un prêt de l'aide financière aux études : 14 % fédéral et 20 % Québec." },
    { k: "partMoi", l: "Part de la dette qui vous revient", u: "%", s: 1 },
    { k: "paiementMoi", l: "Part des paiements que vous faites", u: "%", s: 1 },
  ];
  function feuilleDette(i) {
    ouvrirFeuille(S.dettes[i].nom || "Dette", c => {
      const d = S.dettes[i];
      const nom = el("input", "nom-element"); nom.type = "text"; nom.value = d.nom; nom.setAttribute("aria-label", "Nom de la dette"); lierListe("dettes", i, "nom")(nom);
      const g = el("div", "groupe"); g.appendChild(nom); c.appendChild(g);
      // Selon votre plan : se met à jour pendant la saisie.
      const g2 = el("div", "groupe"); g2.appendChild(el("h3", null, "Selon votre plan"));
      const infos = el("div", "rangees"); g2.appendChild(infos); c.appendChild(g2);
      feuilleCourante.maj = () => rangees(infos, infosDette(i));
      feuilleCourante.maj();
      c.appendChild(el("div", "groupe")).appendChild(el("h3", null, "Conditions"));
      for (const ch of CHAMPS_DETTE) {
        if (ch.seul && d.type !== ch.seul) continue;
        if (ch.sauf && ch.sauf(d)) continue;
        const ligne = creerChamp(ch, `d-${d.id}-${ch.k}`, lierListe("dettes", i, ch.k), false);
        const inp = ligne.querySelector("input, select");
        if (inp.type === "checkbox") inp.checked = !!d[ch.k]; else inp.value = d[ch.k] ?? "";
        c.appendChild(ligne);
      }
      const a = el("div", "feuille-actions");
      const x = el("button", "bouton danger large", "Supprimer cette dette"); x.type = "button"; x.dataset.suppr = "dettes"; x.dataset.i = i;
      a.appendChild(x); c.appendChild(a);
    });
  }
  const duree = n => !isFinite(n) ? "jamais, au paiement actuel" : `${Math.floor(n / 12)} ans${Math.round(n % 12) ? ` et ${Math.round(n % 12)} mois` : ""}`;
  function infosDette(i) {
    const d = S.dettes[i], x = R && R.sim.dettes[i];
    if (!d || !x) return [];
    const pm = d.frequence === "2sem" ? d.paiement * 26 / 12 : d.paiement;
    const l = [];
    if (d.type === "hypotheque" && !d.interetsSeulement) {
      l.push({ titre: "Amortissement restant", sous: "Au paiement actuel, sans remboursement anticipé", valeur: duree(C.moisRestants(d.solde, C.tauxMensuel(d, d.taux), pm)) });
      const r = x.premierRenouvellement;
      if (r) l.push({ titre: `Renouvellement en ${moisAn(r.date)}`, sous: `À ${nb(r.taux, 2)} %, scénario ${SCENARIOS[R.scenario].toLowerCase()} · solde de ${$(r.solde)}`, valeur: `${$(r.paiement)} / mois`, valeurSous: `aujourd'hui ${$(pm)}` });
    }
    if (d.type === "marge") {
      l.push({ titre: "Intérêts par mois", sous: `À ${nb(d.taux, 2)} %`, valeur: $(d.solde * d.taux / 1200) });
      if (d.limite > 0) l.push({ titre: "Crédit disponible", valeur: $(Math.max(0, d.limite - d.solde)) });
    }
    l.push({ titre: "Remboursée", sous: `Méthode ${NOMS_METHODES[R.methode].toLowerCase()}`, valeur: x.fin ? moisAn(x.fin) : "jamais", valeurSous: `${$(x.interetsNets)} d'intérêts nets` });
    return l;
  }
  function feuilleEnfant(i) {
    ouvrirFeuille(S.epargne.reee.enfants[i].nom || "Enfant", c => {
      const e = S.epargne.reee.enfants[i];
      const nom = el("input", "nom-element"); nom.type = "text"; nom.value = e.nom; nom.setAttribute("aria-label", "Nom ou surnom"); lierListe("enfants", i, "nom")(nom);
      const g = el("div", "groupe"); g.appendChild(nom); c.appendChild(g);
      [{ k: "age", l: "Âge", u: "ans", s: 1 }, { k: "solde", l: "Solde du REEE", u: "$", s: 100 }].forEach(ch => {
        const ligne = creerChamp(ch, `e-${e.id}-${ch.k}`, lierListe("enfants", i, ch.k), false);
        ligne.querySelector("input").value = e[ch.k];
        c.appendChild(ligne);
      });
      c.appendChild(el("p", "aide", "L'âge sert aussi au calcul des allocations familiales et de la prime d'assurance médicaments."));
      const a = el("div", "feuille-actions");
      const x = el("button", "bouton danger large", "Retirer cet enfant"); x.type = "button"; x.dataset.suppr = "enfants"; x.dataset.i = i;
      a.appendChild(x); c.appendChild(a);
    });
  }

  /* ============================================================
     CALCULS
     ============================================================ */
  const mensuel = b => b.periode === "an" ? b.montant / 12 : b.montant;
  const SCENARIOS = { prudent: "Prudent", realiste: "Réaliste", optimiste: "Optimiste" };
  const MODES = ["horaire", "mixte", "acte"];
  const METHODES = ["avalanche", "hybride", "boule", "minimum"];
  const NOMS_METHODES = { avalanche: "Avalanche", hybride: "Hybride", boule: "Boule de neige", minimum: "Minimums seulement" };
  const AVEC_ARTICLE = { avalanche: "l'avalanche", hybride: "l'hybride", boule: "la boule de neige", minimum: "les minimums" };
  const minimumDette = d => d.interetsSeulement ? d.solde * d.taux / 100 / 12 : (d.frequence === "2sem" ? d.paiement * 26 / 12 : d.paiement);

  // Objectifs d'épargne : ce qu'il faut mettre de côté chaque mois pour atteindre la cible à la date visée.
  const COMPTES_OBJECTIF = { dedie: "Un compte à part", celi: "CELI", celiapp: "CELIAPP", encaisse: "Comptes et encaisse", reer: "REER" };
  const moisEntre = (debut, fin) => { const [a, b] = String(debut).split("-").map(Number), [c, d] = String(fin || "").split("-").map(Number); return c && d ? (c - a) * 12 + (d - b) : 0; };
  // Tirages au hasard reproductibles (mulberry32) et loi normale (Box-Muller).
  function aleatoire(graine) {
    let a = graine >>> 0;
    return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const normale = alea => () => Math.sqrt(-2 * Math.log(1 - alea())) * Math.cos(2 * Math.PI * alea());
  function calculerObjectifs(R) {
    const e = S.epargne, ca = e.celiapp || { solde: 0 };
    const solde = { celi: e.celi.solde, celiapp: ca.solde || 0, encaisse: e.encaisse, reer: e.reer.solde };
    const cotisation = { celi: e.celi.cotisationAnnuelle, celiapp: R.celiappAnnee(0), encaisse: 0, reer: e.reer.cotisationAnnuelle };
    return (S.objectifs || []).map(o => {
      const dedie = !(o.compte in solde), mois = Math.max(0, moisEntre(S.strategie.debut, o.date));
      const s = dedie ? +o.deja || 0 : +solde[o.compte] || 0, manque = Math.max(0, (+o.cible || 0) - s);
      const mensuel = mois > 0 ? manque / mois : 0;
      return { ...o, dedie, mois, solde: s, manque, mensuel, prevu: dedie ? mensuel : (cotisation[o.compte] || 0) / 12, atteint: manque <= 0 };
    });
  }
  function calculer() {
    const R = {};
    // Pratique principale : GMF ou clinique (à l'acte), GMF-U ou CLSC (trois modes), plus les activités.
    R.milieu = MILIEUX[S.revenu.milieu] ? S.revenu.milieu : "clinique";
    R.modes = MILIEUX[R.milieu].modes;
    R.plusieursModes = R.modes.length > 1;
    // Autres revenus : professionnels (avec la pratique) et non professionnels (imposables, sans RRQ).
    R.autresPro = S.revenu.lignes.filter(estPro).reduce((t, l) => t + annuelLigne(l), 0);
    R.autresNonPro = S.revenu.lignes.filter(l => !estPro(l)).reduce((t, l) => t + annuelLigne(l), 0);
    // Enseignement et supervision d'apprenants : en GMF-U seulement.
    const autresRev = (S.revenu.autresRevenus || 0) + R.autresPro;
    const entree = (x = {}) => R.milieu === "gmfu" ? { ...S.revenu, autresRevenus: autresRev, ...x }
      : { ...S.revenu, autresRevenus: autresRev, enseignement: 0, residents: 0, externes: 0, patientsPendantSupervision: 0, ...x };
    const revenuDe = x => C.revenuGmfu(entree(x));
    R.rev = revenuDe();
    const mode = !R.plusieursModes ? R.modes[0] : MODES.includes(S.revenu.modeBudget) ? S.revenu.modeBudget : "horaire";
    R.mode = mode;
    R.brut = R.rev[mode].total;
    R.couple = !!S.conjointe.active;
    R.locataire = S.actifs.logement === "locataire";
    // Couple pour l'impôt, les allocations et l'assurance médicaments : mariés ou en union civile ;
    // conjoints de fait après 12 mois de vie commune ou avec un enfant commun. Sinon, chacun est
    // imposé seul (pas de transfert de crédits, allocations selon son seul revenu), même s'ils
    // partagent le logement et les dépenses.
    R.coupleFiscal = R.couple && (S.conjointe.lien !== "fait" || !!S.conjointe.depuis12mois || !!S.conjointe.enfantCommun);
    R.interetsEtudes = S.dettes.filter(d => d.creditImpot > 0).reduce((a, d) => a + d.solde * d.taux / 100, 0);
    // Dépenses professionnelles : le total, ou la somme du détail.
    R.depensesPro = S.impot.depensesProMode === "detail" ? S.impot.depensesProDetail.reduce((t, l) => t + annuelLigne(l), 0) : S.impot.depensesPro;
    // CELIAPP : cotisations jusqu'au plafond à vie de 40 000 $ ; déductibles comme le REER.
    const ca = S.epargne.celiapp || { solde: 0, cotisationAnnuelle: 0 };
    R.celiappAnnee = a => Math.min(ca.cotisationAnnuelle || 0, Math.max(0, 40000 - (ca.solde || 0) - a * (ca.cotisationAnnuelle || 0)));
    const base = { depensesPro: R.depensesPro, reer: S.epargne.reer.cotisationAnnuelle + R.celiappAnnee(0), interetsEtudes: R.interetsEtudes, autresImposables: R.autresNonPro };
    // Partenaire : salarié, ou à son compte (même calcul que le médecin travailleur autonome).
    // reel : facteur de revenu en dollars d'aujourd'hui (années futures).
    R.autonomeP = R.couple && S.conjointe.statut === "autonome";
    const impotPartenaire = (reel = 1) => !R.couple ? null : R.autonomeP
      ? C.impotParticulier({ revenu: ((S.conjointe.revenuAutonome || 0) + (S.conjointe.autresRevenus || 0)) * reel, depensesPro: S.conjointe.depensesAutonome || 0 })
      : C.impotSalarie({ salaire: (S.conjointe.statut === "sans" ? 0 : S.conjointe.salaire) * reel, rpa: S.conjointe.rpa, syndicat: S.conjointe.syndicat, autresRevenus: S.conjointe.autresRevenus * reel });
    R.depensesPartenaire = R.autonomeP ? S.conjointe.depensesAutonome || 0 : 0;
    const salariee = impotPartenaire();
    // Pratique incorporée : la société reçoit les revenus et verse des dividendes ;
    // sinon, travail autonome. f : facteur des dividendes fixes en dollars d'aujourd'hui.
    R.societeActive = S.impot.structure === "societe";
    R.dproPerso = R.societeActive ? 0 : R.depensesPro + R.rev[mode].fraisCabinet;
    const impotDe = (o, f = 1) => R.societeActive
      ? C.impotSociete({ ...o, fraisSociete: S.societe.fraisSociete, tauxSociete: S.societe.tauxSociete / 100, retrait: S.societe.retrait, retraitFixe: S.societe.retraitFixe * f })
      : C.impotParticulier(o);
    // Conjoints : transferts de crédits, calculés pour chaque mode.
    const avec = r => !R.couple ? [r, null] : R.coupleFiscal ? C.transfertsConjoints(r, salariee) : [r, salariee];
    R.impots = {}; const partenaires = {};
    // Frais de cabinet : déductibles (ou payés par la société) ; varient selon le mode. Sur la
    // facturation de la clinique seulement (sans activités ni autres revenus) ; f : facteur des
    // années futures, appliqué aussi aux activités et aux autres revenus.
    const fraisCabinet = (total, md, f = 1) => md === "acte" || S.revenu.fraisCabinetTousModes
      ? Math.max(0, Math.max(0, total - (R.rev.activites + R.rev.polyvalence + R.rev.acte.autres) * f) * (S.revenu.fraisCabinetPct || 0) / 100
        + (S.revenu.fraisCabinetMois || 0) * 12 - (S.revenu.compensationCabinet || 0)) : 0;
    const depensesMode = md => R.depensesPro + R.rev[md].fraisCabinet;
    for (const md of R.modes) [R.impots[md], partenaires[md]] = avec(impotDe({ ...base, depensesPro: depensesMode(md), revenu: R.rev[md].total }));
    // Net après impôt et frais de cabinet (les dépenses professionnelles, égales dans tous les modes, à part).
    R.nets = {};
    for (const md of R.modes) R.nets[md] = R.impots[md].net - (R.societeActive ? 0 : R.rev[md].fraisCabinet);
    R.impot = R.impots[mode];
    R.conjointe = R.couple ? partenaires[mode] : null;
    const totalDe = x => x.totalGlobal ?? x.total;
    // Taux marginal : impôt (société comprise) sur 1 000 $ de plus.
    R.tauxMarginal = (totalDe(impotDe({ ...base, depensesPro: R.depensesPro + fraisCabinet(R.brut + 1000, mode), revenu: R.brut + 1000 }))
      - totalDe(impotDe({ ...base, depensesPro: depensesMode(mode), revenu: R.brut }))) / 1000;
    // Revenu net d'impôt et de frais de cabinet pour un autre revenu brut (mêmes déductions, mêmes transferts).
    R.netPour = (rev, frais = 0) => avec(impotDe({ ...base, depensesPro: R.depensesPro + frais, revenu: rev }))[0].net - (R.societeActive ? 0 : frais);
    // Sensibilité : revenu brut et net pour d'autres valeurs d'un champ (x : ce qui change).
    const sens = (valeurs, x) => valeurs.map(v => {
      const g = revenuDe(x(v)), o = { v };
      for (const md of R.modes) { o[md] = g[md].total; o[md + "Net"] = R.netPour(g[md].total, g[md].fraisCabinet); }
      return o;
    });
    const dj = S.revenu.demiJournees, pat = S.revenu.patientsParDJ, ens = R.milieu === "gmfu" ? S.revenu.enseignement : 0;
    R.sensDJ = sens([...new Set([4, 5, 6, 7, 8, 9, 10, dj])].filter(n => n >= Math.max(1, ens)).sort((a, b) => a - b), v => ({ demiJournees: v }));
    R.sensPat = sens([...new Set([3, 4, 5, 6, 7, 8, pat])].sort((a, b) => a - b), v => ({ patientsParDJ: v }));
    // REER : impôt sans cotisation, et avec une cotisation donnée (au revenu de l'année).
    const baseMode = { ...base, depensesPro: depensesMode(mode), revenu: R.brut };
    R.impotSansReer = impotDe({ ...baseMode, reer: 0 }).total;
    R.impotAvecReer = m => impotDe({ ...baseMode, reer: m }).total;
    R.remboursementReer = S.epargne.reer.cotisationAnnuelle > 0 ? impotDe({ ...baseMode, reer: 0 }).total - impotDe(baseMode).total : 0;
    // Taux de déduction : ce que rapporte 1 000 $ cotisés au REER (sur le revenu imposable). Il dépasse
    // le taux marginal par dollar facturé quand une part de chaque dollar va aux frais de cabinet.
    R.tauxDeduction = (R.impotSansReer - R.impotAvecReer(1000)) / 1000;

    // Famille : allocations et assurance médicaments, sur le revenu net familial.
    R.ages = S.epargne.reee.enfants.map(x => +x.age).filter(a => a < 18);
    R.netFedFamille = R.impot.revenuNetFed + (R.coupleFiscal ? R.conjointe.revenuNetFed : 0);
    R.netQcFamille = R.impot.revenuNetQc + (R.coupleFiscal ? R.conjointe.revenuNetQc : 0);
    R.famille = C.prestationsFamille({ revenuNetFed: R.netFedFamille, revenuNetQc: R.netQcFamille, ages: R.ages, couple: R.coupleFiscal });
    R.allocations = S.famille.calculAuto ? R.famille.total : S.menage.allocationsAnnuelles;
    const prime = C.primeMedicaments({ revenuNetQc: R.netQcFamille, couple: R.coupleFiscal, ages: R.ages, adultesCouverts: 1 }).parAdulte;
    R.primeMoi = S.famille.medicamentsPublicMoi ? prime : 0;
    // Partenaire qui n'est pas un conjoint pour l'impôt : sa prime selon son propre revenu.
    R.primeConjointe = !R.couple || !S.conjointe.medicamentsPublic ? 0 : R.coupleFiscal ? prime
      : C.primeMedicaments({ revenuNetQc: R.conjointe.revenuNetQc, couple: false, ages: [], adultesCouverts: 1 }).parAdulte;
    const allocMoi = !R.couple || S.famille.versementA !== "conjointe" ? R.allocations : 0;

    // Budget mensuel
    const part = S.menage.partCommunMoi / 100;
    R.travailMoi = (R.impot.net - R.dproPerso - R.primeMoi) / 12;
    R.allocMoi = allocMoi / 12;
    R.netMoi = R.travailMoi + R.allocMoi;
    R.travailConjointe = R.couple ? (R.conjointe.net - R.depensesPartenaire - R.primeConjointe) / 12 : 0;
    R.allocConjointe = R.couple ? (R.allocations - allocMoi) / 12 : 0;
    R.netConjointe = R.travailConjointe + R.allocConjointe;
    R.depMoi = 0; R.depConjointe = 0; R.depMenage = 0;
    for (const b of depensesEffectives()) {
      const m = mensuel(b);
      R.depMenage += m;
      R.depMoi += b.qui === "moi" ? m : b.qui === "commun" ? m * part : 0;
      if (R.couple) R.depConjointe += b.qui === "conjoint" ? m : b.qui === "commun" ? m * (1 - part) : 0;
    }
    R.dettesMoi = 0; R.dettesConjointe = 0; R.dettesMenage = 0;
    for (const d of S.dettes) {
      const m = minimumDette(d);
      R.dettesMenage += m;
      R.dettesMoi += m * (d.paiementMoi ?? 100) / 100;
      if (R.couple) R.dettesConjointe += m * (100 - (d.paiementMoi ?? 100)) / 100;
    }
    const enfants = S.epargne.reee.enfants.filter(x => x.age < 17).length;
    // Objectifs d'épargne dans un compte à part : leur montant mensuel s'ajoute à l'épargne.
    R.objectifs = calculerObjectifs(R);
    R.objectifsMois = R.objectifs.filter(o => o.dedie && o.mois > 0).reduce((t, o) => t + o.mensuel, 0);
    R.objectifsAnnee = a => R.objectifs.filter(o => o.dedie).reduce((t, o) => t + o.mensuel * Math.max(0, Math.min(12, o.mois - 12 * a)), 0);
    R.epargneMoi = (enfants * S.epargne.reee.cotisationAnnuelle + S.epargne.reer.cotisationAnnuelle + S.epargne.celi.cotisationAnnuelle + R.celiappAnnee(0)) / 12 + R.objectifsMois;
    R.surplusMoi = R.netMoi - R.depMoi - R.dettesMoi - R.epargneMoi;
    R.epargneConjointe = R.couple ? S.conjointe.epargneMensuelle || 0 : 0;
    R.surplusConjointe = R.netConjointe - R.depConjointe - R.dettesConjointe - R.epargneConjointe;
    R.revenusMenage = R.netMoi + R.netConjointe + S.menage.autresRevenusMensuels;
    R.surplusMenage = R.revenusMenage - R.depMenage - R.dettesMenage - R.epargneMoi - R.epargneConjointe;

    // Années suivantes : la première année de pratique fait place à une année type
    // (clientèle complète toute l'année), puis les revenus et les dépenses évoluent
    // selon le scénario.
    R.revType = S.revenu.annee === "premiere" ? revenuDe({ annee: "type" }) : R.rev;
    R.scenario = SCENARIOS[S.scenarios.choisi] ? S.scenarios.choisi : "realiste";
    R.hyp = S.scenarios[R.scenario];
    // Surplus de l'année a (0 = cette année), qui va sur les dettes.
    /* Année a (0 = cette année), en dollars de l'année a. Les revenus augmentent selon
       le scénario ; les paliers d'impôt, les crédits, les seuils des allocations et la
       prime d'assurance médicaments suivent l'inflation : on calcule donc l'impôt en
       dollars d'aujourd'hui, puis on le ramène en dollars de l'année. Les enfants
       vieillissent : allocations selon l'âge, cotisations REEE jusqu'à 17 ans. */
    const cacheAnnee = new Map();
    R.annee = (h, a) => {
      const cle = `${h.hausseRevenus}|${h.inflation}|${a}`;
      if (cacheAnnee.has(cle)) return cacheAnnee.get(cle);
      const I = Math.pow(1 + h.inflation / 100, a), reel = Math.pow(1 + h.hausseRevenus / 100, a) / I;
      let res;
      if (a === 0) res = { travail: R.travailMoi * 12, alloc: R.allocMoi * 12, epargne: (R.epargneMoi - R.objectifsMois) * 12 + R.objectifsAnnee(0), retenu: R.impot.societe ? R.impot.societe.retenu : 0 };
      else {
        const conj = impotPartenaire(reel);
        const fraisA = fraisCabinet(R.revType[mode].total * reel, mode, reel);
        let moi = impotDe({ ...base, reer: S.epargne.reer.cotisationAnnuelle + R.celiappAnnee(a), autresImposables: R.autresNonPro * reel, depensesPro: R.depensesPro + fraisA, revenu: R.revType[mode].total * reel }, 1 / I);
        // L'an prochain, des conjoints de fait auront 12 mois de vie commune : couple pour l'impôt.
        const fisc = R.couple && (R.coupleFiscal || a >= 1);
        if (fisc) moi = C.transfertsConjoints(moi, conj)[0];
        const ages = S.epargne.reee.enfants.map(x => +x.age + a).filter(x => x < 18);
        const nf = moi.revenuNetFed + (fisc ? conj.revenuNetFed : 0), nq = moi.revenuNetQc + (fisc ? conj.revenuNetQc : 0);
        const prime = S.famille.medicamentsPublicMoi ? C.primeMedicaments({ revenuNetQc: nq, couple: fisc, ages, adultesCouverts: 1 }).parAdulte : 0;
        const alloc = S.famille.calculAuto ? C.prestationsFamille({ revenuNetFed: nf, revenuNetQc: nq, ages, couple: fisc }).total * I : S.menage.allocationsAnnuelles;
        const enf = S.epargne.reee.enfants.filter(x => +x.age + a < 17).length;
        res = {
          travail: (moi.net - (R.societeActive ? 0 : R.depensesPro + fraisA) - prime) * I,
          retenu: moi.societe ? moi.societe.retenu * I : 0,
          alloc: !R.couple || S.famille.versementA !== "conjointe" ? alloc : 0,
          epargne: enf * S.epargne.reee.cotisationAnnuelle + S.epargne.reer.cotisationAnnuelle + S.epargne.celi.cotisationAnnuelle + R.celiappAnnee(a) + R.objectifsAnnee(a),
        };
      }
      cacheAnnee.set(cle, res);
      return res;
    };
    const surplusAnnee = h => a => {
      if (S.strategie.extraMode === "manuel") return S.strategie.extraManuel;
      const x = R.annee(h, a);
      return (x.travail + x.alloc - x.epargne) / 12 - R.depMoi * Math.pow(1 + h.inflation / 100, a) - R.dettesMoi;
    };
    R.surplusAnnee = surplusAnnee(R.hyp);

    // Dettes : simulation prolongée jusqu'à l'horizon pour suivre l'argent libéré.
    R.extra = Math.max(0, R.surplusAnnee(0));
    const forfaits = S.strategie.reerSurDettes ? R.remboursementReer : 0;
    const ANNEES = [10, 20, 30].includes(+S.scenarios.horizon) ? +S.scenarios.horizon : 20;
    R.annees = ANNEES;
    const opt = (h, m) => ({ debut: S.strategie.debut, methode: m, extraParAnnee: surplusAnnee(h), ecartTaux: h.ecartTaux,
      forfaitsAnnuels: forfaits, moisForfait: 3, continuerApres: 12 * ANNEES, moisMax: 12 * Math.max(40, ANNEES) });
    R.sims = {};
    for (const m of METHODES) R.sims[m] = C.simulerDettes(S.dettes, opt(R.hyp, m));
    const methode = R.sims[S.strategie.methode] ? S.strategie.methode : "avalanche";
    R.methode = methode;
    R.sim = R.sims[methode];
    R.simulerAvecAjout = ajout => C.simulerDettes(S.dettes, { ...opt(R.hyp, methode), extraParAnnee: a => surplusAnnee(R.hyp)(a) + ajout });
    R.detteTotale = S.dettes.reduce((a, d) => a + d.solde, 0);

    // Valeur nette : maison (sa valeur croît, l'hypothèque payée devient de l'équité), autos, placements.
    const projeter = (h, sim, m = methode, rendements = null) => C.projeterValeurNette({
      annees: ANNEES, anneeDepart: +String(S.strategie.debut).slice(0, 4) || new Date().getFullYear(),
      rendement: h.rendement, rendements, reer: S.epargne.reer, celi: S.epargne.celi, celiapp: S.epargne.celiapp, encaisse: S.epargne.encaisse,
      maison: R.locataire ? { valeur: 0, part: 0, croissance: 0, partMenage: 0 }
        : { ...S.actifs.maison, croissance: h.croissanceMaison, partMenage: S.actifs.maison.part + (R.couple ? S.conjointe.partMaison : 0) },
      voitures: [{ valeur: S.actifs.voiture.valeur, depreciation: h.depreciationAuto },
        ...(R.couple && S.conjointe.voiture > 0 ? [{ valeur: S.conjointe.voiture, depreciation: h.depreciationAuto, conjointe: true }] : [])],
      actifsConjoint: R.couple ? S.conjointe.epargne : 0, dettes: S.dettes,
      epargneConjointe: R.epargneConjointe, hausseEpargneConjointe: h.hausseRevenus, inflation: h.inflation,
      remplacementAutos: S.actifs.voiture.remplacementAns > 0 ? { ans: S.actifs.voiture.remplacementAns, prix: S.actifs.voiture.prixNeuf } : null,
      societe: R.societeActive ? { solde: S.societe.solde || 0, retenuAnnee: a => R.annee(h, a).retenu, impotPlacement: 0.5 } : null,
      ajoutMensuel: m === "minimum" ? surplusAnnee(h) : null,
      autresActifs: (S.actifs.autres || []).map(x => ({ valeur: +x.valeur || 0, croissance: +x.croissance || 0, part: x.partMoi ?? 100, partMenage: R.couple ? 100 : x.partMoi ?? 100 })),
      objectifs: R.objectifs.filter(o => o.dedie).map(o => ({ solde: o.solde, mensuel: o.mensuel, mois: o.mois, depenser: !!o.depenser })),
    }, sim);
    // Méthodes comparées sur la valeur nette à l'horizon : elle tient compte des intérêts, de l'argent
    // en attente d'un renouvellement et des placements faits après la dernière dette.
    R.vnMethodes = {};
    for (const m of METHODES) { const pr = projeter(R.hyp, R.sims[m], m); R.vnMethodes[m] = pr[pr.length - 1]; }
    R.recommandee = METHODES.filter(m => m !== "minimum").reduce((a, m) => R.vnMethodes[m].moi > R.vnMethodes[a].moi ? m : a, "avalanche");
    R.projections = {}; R.libres = {};
    for (const k of Object.keys(SCENARIOS)) {
      const sim = k === R.scenario ? R.sim : C.simulerDettes(S.dettes, opt(S.scenarios[k], methode));
      R.projections[k] = projeter(S.scenarios[k], sim);
      R.libres[k] = sim.libre;
    }
    R.projection = R.projections[R.scenario];
    R.projeterAvec = rendement => projeter({ ...R.hyp, rendement }, R.sim);
    // Probabilité de réussite : n avenirs où le rendement de chaque année varie autour de celui du
    // scénario (écart type vol). Graine fixe : les mêmes tirages d'un affichage à l'autre.
    R.monteCarlo = (n, vol) => {
      const z = normale(aleatoire(20260425)), runs = [];
      for (let k = 0; k < n; k++) runs.push(projeter(R.hyp, R.sim, methode, Array.from({ length: ANNEES }, () => Math.max(-60, R.hyp.rendement + vol * z()))));
      const tries = new Map();
      const quantile = (cle, i, q) => {
        const c = cle + i; if (!tries.has(c)) tries.set(c, runs.map(r => r[i][cle]).sort((a, b) => a - b));
        const v = tries.get(c); return v[Math.min(v.length - 1, Math.floor(q * v.length))];
      };
      const atteintes = new Map();
      const chancesIndependance = (annee, couple) => {
        if (!atteintes.has(couple)) atteintes.set(couple, runs.map(r => independance(R, couple, r).annee));
        return atteintes.get(couple).filter(a => a && a <= annee).length / n;
      };
      return { quantile, chancesIndependance };
    };
    // Dollars d'aujourd'hui : on retire l'inflation du scénario choisi.
    R.deflateur = a => S.scenarios.dollarsAujourdhui ? Math.pow(1 + R.hyp.inflation / 100, a) : 1;
    R.reee = C.projeterReee({ enfants: S.epargne.reee.enfants, cotisationAnnuelle: S.epargne.reee.cotisationAnnuelle }, R.hyp.rendement / 100);

    // Société : le ménage a besoin de vous de quoi couvrir votre part.
    R.besoinNet = Math.max(0, (R.depMoi + R.dettesMoi + R.extra + (enfants * S.epargne.reee.cotisationAnnuelle + S.epargne.celi.cotisationAnnuelle) / 12) * 12);
    R.societe = C.comparerSociete({ revenu: R.brut, depensesPro: R.depensesPro, fraisSociete: S.societe.fraisSociete,
      tauxSociete: S.societe.tauxSociete / 100, besoinNet: R.besoinNet });
    return R;
  }

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
  // Préférence d'affichage enregistrée (mode, méthode) : pas une donnée saisie.
  function changer(p, v) { ecrire(p, v); sauver(); remplirChamps(); tout(); }
  // Changer de pratique principale.
  function choisirMilieu(v) {
    if (!MILIEUX[v]) return;
    S.revenu.milieu = v; S.meta.exemple = false; synchroniserTarifs(S);
    sauver(); remplirChamps(); tout();
  }
  // Vues qui ne changent pas les données : budget de qui, valeur nette de qui.
  const U = { vueBudget: "moi", vueAvenir: "moi", sensVue: "net" };
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
    const pas = pasJoli((max - min) / 4);
    min = Math.floor(min / pas) * pas; max = Math.ceil(max / pas) * pas;
    const axe = v => Math.abs(v) < 1e-6 ? "0 $" : Math.abs(v) >= 1e6 ? nb(v / 1e6, 1) + " M$" : pas < 10000 ? nb(v / 1000, 1) + " k$" : k$(v);
    const x = i => m.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = v => m.t + ih - ((v - min) / (max - min)) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${options.titre}">`;
    for (let v = min; v <= max + 1e-6; v += pas) {
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
  // Séries annuelles des soldes de dettes (janvier de chaque année).
  function seriesDettes(sim, cumul) {
    const mois = sim.iLibre >= 0 ? sim.mois.slice(0, sim.iLibre + 1) : sim.mois;
    const pts = mois.filter((m, i) => i === 0 || m.date.getMonth() === 0);
    const fin = mois[mois.length - 1];
    // Le dernier mois remplace le janvier de la même année, pour ne pas répéter l'année sur l'axe.
    if (pts[pts.length - 1] !== fin) { if (pts[pts.length - 1].date.getFullYear() === fin.date.getFullYear()) pts[pts.length - 1] = fin; else pts.push(fin); }
    const etiquettes = pts.map(p => String(p.date.getFullYear()));
    if (cumul) return { etiquettes, series: [{ nom: "Total des dettes", couleur: SERIES[0], valeurs: pts.map(p => p.total) }], pts };
    return { etiquettes, series: S.dettes.map((d, j) => ({ nom: d.nom, couleur: SERIES[j % SERIES.length], valeurs: pts.map(p => p.soldes[j]) })), pts };
  }

  /* ============================================================
     RENDUS
     ============================================================ */
  const NOM_MODE = { horaire: "Taux horaire", mixte: "Taux mixte", acte: "À l'acte" };
  const AU_MODE = { horaire: "au taux horaire", mixte: "au taux mixte", acte: "à l'acte" };
  const COULEUR_MODE = { horaire: SERIES[0], mixte: SERIES[1], acte: SERIES[2] };
  // Libellé du revenu utilisé : pratique principale et mode.
  const libelleRevenu = () => `${MILIEUX[R.milieu].nom} · ${NOM_MODE[R.mode]}`;
  // Choix du mode : seulement s'il y en a plusieurs (GMF-U, CLSC).
  const choixMode = id => {
    document.getElementById(id).hidden = !R.plusieursModes;
    if (R.plusieursModes) segment(id, [["horaire", "Horaire"], ["mixte", "Mixte"], ["acte", "À l'acte"]], R.mode, v => changer("revenu.modeBudget", v), "Mode de rémunération utilisé");
  };

  function rendreApercu(R) {
    document.getElementById("ap-exemple").hidden = !S.meta.exemple;
    rendrePortrait();
    hero("ap-hero", "Votre surplus mensuel", $(R.surplusMoi), [
      R.surplusMoi >= 0 ? `Sur un revenu net de ${$(R.netMoi)} par mois` : puce("Vos sorties dépassent vos revenus", "bas", false),
    ], R.surplusMoi);

    // Ce mois-ci : où va votre revenu net.
    const flux = document.getElementById("ap-flux"); flux.textContent = "";
    const parts = [["Dépenses", R.depMoi, SERIES[0]], ["Paiements de dettes", R.dettesMoi, SERIES[1]], ["Épargne", R.epargneMoi, SERIES[2]], ["Surplus", Math.max(0, R.surplusMoi), SERIES[3]]];
    const barre = el("div", "flux-barre");
    barre.setAttribute("role", "img");
    barre.setAttribute("aria-label", parts.map(([n, v]) => `${n} ${$(v)}`).join(", "));
    parts.forEach(([n, v, c]) => { if (v > 0) { const sp = el("span"); sp.style.flex = `${v} 0 0`; sp.style.background = c; sp.title = `${n} : ${$(v)}`; barre.appendChild(sp); } });
    flux.appendChild(barre);
    if (R.surplusMoi < 0) { const mq = el("p", "flux-manque"); mq.append(icone("alerte"), document.createTextNode(`Il manque ${$(-R.surplusMoi)} par mois.`)); flux.appendChild(mq); }
    const base = Math.max(1, R.netMoi);
    flux.appendChild(rangees(el("div"), [
      ...parts.map(([n, v, c]) => ({ titre: n, couleur: c, valeur: $(v), valeurSous: pct(v / base, 0) + " du revenu" })),
      { titre: "Revenu net", cls: "total", valeur: $(R.netMoi) },
    ]));

    const t = document.getElementById("ap-tuiles"); t.textContent = "";
    const tuileLien = (onglet, titre, valeur, sous) => {
      const a = el("a", "tuile"); a.href = "#" + onglet;
      a.append(el("div", "tuile-titre", titre), el("div", "tuile-valeur", valeur));
      if (sous) a.appendChild(el("div", "tuile-sous", sous));
      return a;
    };
    const p = R.projection, dix = p[Math.min(10, p.length - 1)];
    t.append(
      tuileLien("revenu", "Revenu brut", $(R.brut), libelleRevenu()),
      tuileLien("impot", "Net après impôt", $(R.impot.net), `${$(R.impot.net / 12)} par mois`),
      tuileLien("budget", "Dettes", $(R.detteTotale), R.sim.libre ? `Sans dettes en ${moisAn(R.sim.libre)}` : "Jamais remboursées à ce rythme"),
      tuileLien("avenir", "Valeur nette", $(p[0].moi), `${dix.annee} : ${$(dix.moi / R.deflateur(dix.annee - p[0].annee))}`),
    );

    const a = document.getElementById("ap-actions"); a.textContent = "";
    const action = (type, texte) => {
      const li = el("li"); const ico = el("span", "ico " + type);
      ico.appendChild(icone(type === "important" ? "alerte" : type === "bon" ? "ok" : "info"));
      const lib = el("span", "visuellement-cache", type === "important" ? "Important : " : type === "bon" ? "Bien : " : "À noter : ");
      const txt = el("span"); txt.append(lib, document.createTextNode(texte));
      li.append(ico, txt); a.appendChild(li);
    };
    if (R.societeActive) action("important", `La société garde environ ${$(R.impot.societe.impotSociete / 12)} par mois pour son impôt ; vous, environ ${$(R.impot.total / 12)} par mois pour l'impôt sur vos dividendes.`);
    else action("important", `Mettez ${pct(R.impot.total / Math.max(1, R.brut), 0)} de chaque paiement de la RAMQ de côté pour l'impôt et les cotisations, environ ${$(R.impot.total / 12)} par mois.`);
    // Après l'assistant : ce qu'il reste à entrer.
    if (S.meta.assistant) {
      if (depensesEffectives().filter(b => b.montant > 0 && b.k !== "loyer").length < 3) action("important", "Entrez vos dépenses du mois (page Budget) : épicerie, électricité, assurances, transport… Sans elles, le surplus est surestimé.");
      if ((S.revenu.activites || []).some(x => x.calcul !== "patients" && ACTIVITES[x.type] && x.parJour === ACTIVITES[x.type].parJour))
        action("info", "Vérifiez le revenu par jour de vos activités en établissement (page Revenu) : les valeurs de départ sont indicatives.");
      if (!S.epargne.encaisse && !S.epargne.reer.solde && !S.epargne.celi.solde && !S.epargne.reer.droits) action("info", "Ajoutez votre épargne et vos droits REER (page Patrimoine, bouton Modifier).");
    }
    if (!S.meta.exemple) {
      const notes = (S.suivi || {}).instantanes || [], derniere = notes.length ? Math.floor((Date.now() - new Date(notes[notes.length - 1].date + "T00:00:00")) / 864e5) : null;
      if (derniere === null) action("info", "Notez votre valeur nette d'aujourd'hui (page Patrimoine) : vous pourrez ensuite comparer le réel au plan.");
      else if (derniere > 90) action("info", `Votre dernier relevé de patrimoine date de ${derniere} jours : mettez vos soldes à jour et notez votre situation (page Patrimoine).`);
    }
    if (!S.meta.exemple && !(S.bilans || []).some(b => b.mois === moisPasse() && (b.recu != null || b.depense != null)))
      action("info", `Faites le bilan de ${nomMois(moisPasse())} (page Budget) : ce que vous avez reçu et dépensé, comparé au budget.`);
    R.objectifs.filter(o => !o.atteint && !o.mois).forEach(o => action("important", `L'objectif « ${o.nom || "sans nom"} » n'est pas atteint à la date visée : choisissez une nouvelle date (page Patrimoine).`));
    if (S.revenu.annee === "premiere") action("important", `Première année de pratique : aucun acompte n'est exigé, mais environ ${$(R.impot.total)} seront à payer d'un coup le 30 avril.`);
    if (R.couple && S.conjointe.statut !== "sans" && !(S.conjointe.statut === "autonome" ? S.conjointe.revenuAutonome : S.conjointe.salaire)) action("important", `Inscrivez le revenu de ${votreP()} (Budget, bouton Ménage) : son impôt, les transferts de crédits, les allocations et la prime d'assurance médicaments en dépendent.`);
    if (!S.confirmes["famille.medicamentsPublicMoi"] || (R.couple && !S.confirmes["conjointe.medicamentsPublic"]))
      action("info", `Confirmez l'assurance médicaments de chaque adulte : pour le régime public, la prime, jusqu'à 766 $ par adulte en 2026, est comptée ${R.primeMoi + R.primeConjointe > 0 ? `(${$(R.primeMoi + R.primeConjointe)} cette année)` : "seulement pour une personne sans assurance collective"}.`);
    const auj = new Date(S.strategie.debut + "-01T00:00:00");
    S.dettes.filter(d => d.type === "hypotheque" && d.finTerme).forEach(d => {
      const f = new Date(d.finTerme + "T00:00:00"); const mois = (f - auj) / 2.63e9;
      if (mois >= 0 && mois <= 18) action("info", `Renouvellement de « ${d.nom} » le ${f.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })} : versez un montant forfaitaire sans pénalité si possible, et ne rallongez pas l'amortissement.`);
    });
    S.dettes.filter(d => d.type === "marge" && d.limite > 0).forEach(d => action("info", `Disponible sur « ${d.nom} » : ${$(d.limite - d.solde)}. Gardez cet espace comme fonds d'urgence plutôt que de l'argent qui dort.`));
    if (S.epargne.reee.enfants.filter(e => e.age < 17).length > 0 && S.epargne.reee.cotisationAnnuelle < 2500) action("info", "Cotisez 2 500 $ par enfant par année au REEE pour obtenir toutes les subventions (30 %).");
    if (S.epargne.reer.droits > 0 && S.epargne.reer.cotisationAnnuelle === 0) action("info", `Vous avez ${$(S.epargne.reer.droits)} de droits REER. Chaque 1 000 $ cotisés vous remet environ ${$(R.tauxDeduction * 1000)} d'impôt (${pct(R.tauxDeduction, 0)}).`);
    if (!S.meta.exemple) {
      const jours = S.meta.dernierExport ? Math.floor((Date.now() - new Date(S.meta.dernierExport)) / 864e5) : Infinity;
      if (jours > 30) action("info", jours === Infinity
        ? "Exportez une sauvegarde de vos données (page Données) : elles ne vivent que dans ce navigateur."
        : `Votre dernière sauvegarde date de ${jours} jours : exportez-en une nouvelle (page Données).`);
    }
    S.dettes.forEach(d => {
      if (d.type === "marge" && d.limite > 0 && d.solde > d.limite) action("important", `« ${d.nom} » dépasse sa limite de ${$(d.solde - d.limite)} : vérifiez le solde et la limite.`);
      const pm = d.frequence === "2sem" ? d.paiement * 26 / 12 : d.paiement;
      if (!d.interetsSeulement && d.solde > 0 && pm <= d.solde * C.tauxMensuel(d, d.taux)) action("important", `Le paiement de « ${d.nom} » ne couvre pas les intérêts : vérifiez le montant, ou choisissez « Intérêts seulement ».`);
    });
    alertesRamq(R, action);
    const mix = Object.values(S.revenu.mix).reduce((a, x) => a + (+x || 0), 0);
    if (Math.abs(mix - 100) > 0.5) action("info", `Vos types de visites totalisent ${nb(mix)} % : le calcul les ramène à 100 %. Ajustez-les dans Revenu, Modifier, pour refléter votre pratique.`);
    if (R.surplusMoi < 0) action("important", `Votre budget est négatif de ${$(-R.surplusMoi)} par mois : revoyez les dépenses ou leur partage.`);
    else action("bon", `Votre surplus de ${$(R.surplusMoi)} par mois va sur les dettes, dans l'ordre de la méthode choisie.`);

    rangees("ap-echeances", echeances(R));
    rangees("ap-jalons", jalons(R));
    document.getElementById("ap-dettes-sous").textContent = R.sim.libre
      ? `De ${$(R.detteTotale)} aujourd'hui à zéro en ${moisAn(R.sim.libre)}.`
      : "À ce rythme, la marge de crédit n'est jamais remboursée.";
    const sd = seriesDettes(R.sim, true);
    graphiqueLignes(document.getElementById("ap-graph-dettes"), null, sd.series, sd.etiquettes, { titre: "Total des dettes par année", aire: true });
  }

  // Prochaines échéances : impôt, acomptes, REER, déclarations, renouvellements, REEE.
  function echeances(R) {
    const auj = new Date(); auj.setHours(0, 0, 0, 0);
    const an = auj.getFullYear(), anImpot = (+String(S.strategie.debut).slice(0, 4) || an) + 1;
    const l = [], premiere = S.revenu.annee === "premiere", t = R.impot.total;
    const prochaine = (m, j) => { const d = new Date(an, m, j); return d < auj ? new Date(an + 1, m, j) : d; };
    if (premiere) l.push({ date: new Date(anImpot, 3, 30), titre: "Solde de l'impôt", sous: "Première année : fédéral et Québec", valeur: $(t) });
    for (const y of [an, an + 1, an + 2]) for (const [m, j] of [[2, 15], [5, 15], [8, 15], [11, 15]]) {
      if (premiere && y < anImpot) continue;
      l.push({ date: new Date(y, m, j), titre: "Acompte provisionnel", sous: "Impôt et cotisations", valeur: $(t / 4) });
    }
    l.push({ date: prochaine(5, 15), titre: "Déclarations de revenus", sous: "Date limite pour un travailleur autonome ; le solde était dû le 30 avril" });
    if (S.epargne.reer.droits > 0 || S.epargne.reer.cotisationAnnuelle > 0) {
      let d = new Date(an, 0, 60); if (d < auj) d = new Date(an + 1, 0, 60);
      l.push({ date: d, titre: "Limite REER", sous: `Cotisations déductibles pour l'année ${d.getFullYear() - 1}`, valeur: S.epargne.reer.cotisationAnnuelle > 0 ? $(S.epargne.reer.cotisationAnnuelle) : undefined });
    }
    S.dettes.filter(d => d.type === "hypotheque" && d.finTerme).forEach((d, k) => {
      const f = new Date(d.finTerme + "T00:00:00");
      const x = R.sim.dettes[S.dettes.indexOf(d)], r = x && x.premierRenouvellement;
      l.push({ date: f, titre: `Renouvellement : ${d.nom}`, sous: r ? `Paiement estimé ${$(r.paiement)} par mois à ${nb(r.taux, 2)} %` : "Comparez les offres ; ne rallongez pas l'amortissement" });
    });
    if (S.epargne.reee.enfants.some(e => e.age < 17) && S.epargne.reee.cotisationAnnuelle > 0)
      l.push({ date: prochaine(11, 31), titre: "Cotisation REEE de l'année", sous: "Pour recevoir les subventions de l'année (30 %)", valeur: $(S.epargne.reee.cotisationAnnuelle * S.epargne.reee.enfants.filter(e => e.age < 17).length) });
    lignesAnnuelles().filter(x => x.mois && x.montant >= 200).forEach(x => l.push({ date: prochaine(x.mois - 1, 1), titre: x.nom, sous: "Dépense annuelle", valeur: $(x.montant) }));
    const jours = d => Math.round((d - auj) / 864e5);
    return l.filter(x => x.date >= auj).sort((a, b) => a.date - b.date).slice(0, 5).map(x => {
      const j = jours(x.date);
      const quand = j === 0 ? "aujourd'hui" : j < 31 ? `dans ${j} jour${j > 1 ? "s" : ""}` : `dans ${Math.round(j / 30.4)} mois`;
      return { date: x.date, titre: x.titre, sous: `${x.sous} · ${quand}`, valeur: x.valeur, valeurSous: x.date.getFullYear() !== an ? String(x.date.getFullYear()) : undefined };
    });
  }

  // Jalons : chaque dette remboursée, plus de dettes, valeur nette positive puis par paliers.
  function jalons(R) {
    const l = [], mois = d => d.toLocaleDateString("fr-CA", { month: "short" }).replace(".", "");
    const derniere = R.sim.libre && S.dettes.length > 1 ? R.sim.libre.getTime() : null;
    S.dettes.forEach((d, i) => {
      const f = R.sim.dettes[i] && R.sim.dettes[i].fin;
      // La dernière dette remboursée est annoncée par « Plus aucune dette ».
      if (f && f.getTime() !== derniere) l.push({ t: f, jalon: { mois: mois(f), annee: f.getFullYear() }, titre: d.nom, sous: `Remboursement complet · ${$(d.solde)} aujourd'hui` });
    });
    if (R.sim.libre && S.dettes.length > 1) l.push({ t: R.sim.libre, jalon: { mois: mois(R.sim.libre), annee: R.sim.libre.getFullYear() }, titre: "Plus aucune dette", sous: `${$(R.detteTotale)} remboursés ; le budget des dettes est ensuite placé`, cls: "fort" });
    const p = R.projection, debut = p[0].moi;
    for (const seuil of [0, 250000, 500000, 1000000, 2000000]) {
      if (debut >= seuil) continue;
      const i = p.findIndex(x => x.moi >= seuil);
      if (i > 0) l.push({ t: new Date(p[i].annee, 0, 1), jalon: { annee: p[i].annee }, titre: seuil === 0 ? "Valeur nette positive" : `Valeur nette de ${seuil >= 1e6 ? nb(seuil / 1e6, 0) + " M$" : nb(seuil / 1000, 0) + " k$"}`, sous: `Scénario ${SCENARIOS[R.scenario].toLowerCase()}` });
    }
    const F = independance(R, false);
    if (F.annee) l.push({ t: new Date(F.annee, 0, 2), jalon: { annee: F.annee }, titre: "Indépendance financière", sous: `Placements de ${nb(F.mult)} fois vos dépenses de l'année${F.age ? ` · à ${F.age} ans` : ""}`, cls: "fort" });
    (S.jalonsPerso || []).filter(x => x.annee >= p[0].annee).forEach(x => {
      const k = Math.min(p.length - 1, x.annee - p[0].annee);
      l.push({ t: new Date(x.annee, 0, 3), jalon: { annee: x.annee }, titre: x.nom || "Jalon", sous: `Valeur nette projetée : ${$(p[k].moi / R.deflateur(k))}` });
    });
    return l.sort((a, b) => a.t - b.t).slice(0, 8);
  }

  /* Alertes de la RAMQ dans « À faire » : plafond d'heures, seuils de patients inscrits (tarifs,
     montants liés au volume, pratique polyvalente), assiduité et forfait GMF. */
  function alertesRamq(R, action) {
    const g = R.rev, rv = S.revenu, inscrits = Math.round(g.inscritsFin);
    if (R.mode === "horaire" && g.heuresAuDela > 0) action("important", `Taux horaire : ${nb(g.heuresAuDela, 0)} h au-delà de ${nb(g.plafondHeures, 0)} h par année sont payées à 71,8 %, environ ${$(g.perteHeures)} de moins. `
      + (g.plafondHeures < 2420 ? "Si votre chef de département autorise le dépassement (jusqu'à 880 h, annexe XIV), inscrivez-le dans Revenu, Modifier." : "C'est au-delà du dépassement maximal de 880 heures."));
    if (R.mode !== "horaire" && inscrits >= 350 && inscrits < 500 && g.gainPalier > 0)
      action("info", `Encore ${nb(500 - inscrits, 0)} patients inscrits pour atteindre 500 : chaque visite est alors payée environ ${pct(g.gainPalier, 0)} de plus.`);
    const seuil = [[750, 7500], [1000, 15000]].find(([s]) => inscrits < s && inscrits >= s - 100);
    if (seuil) action("info", `Encore ${nb(seuil[0] - inscrits, 0)} patients inscrits actifs au 31 décembre pour recevoir ${$(seuil[1])}${seuil[0] === 1000 ? " au lieu de 7 500 $" : ""} en juin (EP 40, par. 4.15).`);
    if (g.basePolyvalence > 0) {
      const n = Math.round(g.inscritsFin + Math.max(0, g.vulnerablesFin - 245) * 1.5), prochain = C.SEUILS_POLYVALENCE[g.anneePratique].find(s => s > n);
      if (prochain && prochain - n <= 100) {
        const taux = C.tauxPolyvalence(prochain, 0, g.anneePratique);
        action("info", `Encore ${nb(prochain - n, 0)} patients inscrits pour une majoration de ${nb(taux, 1)} % de vos activités en établissement (pratique polyvalente), environ ${$(g.basePolyvalence * (taux - g.pctPolyvalence) / 100)} de plus.`);
      }
    }
    if (rv.assiduite80 === false) {
      const perdu = C.montantsVolume(g.inscritsFin, g.vulnerablesFin, true).supplements;
      if (perdu > 0) action("info", `Avec un taux d'assiduité de 80 %, vous recevriez ${$(perdu)} de suppléments au volume (EP 40, par. 15.03).`);
    }
    if (!rv.membreGmf && !S.confirmes["revenu.membreGmf"] && g.forfaitGmfPossible > 0)
      action("info", `${R.milieu === "gmfu" ? "Un GMF-U est un GMF : le" : R.milieu === "clsc" ? "Si votre CLSC fait partie d'un GMF, le" : "Si votre clinique est un GMF, le"} forfait de 9,35 $ par patient vu dans l'année (code 08875) ajouterait environ ${$(g.forfaitGmfPossible)}. Vérifiez-le, puis cochez ou non « Membre d'un GMF » (Revenu, Modifier).`);
  }

  const COURT_MODE = { horaire: "Horaire", mixte: "Mixte", acte: "À l'acte" };
  function rendreRevenu(R) {
    // Pratique principale, en haut de la section.
    const choix = document.getElementById("rv-milieu");
    if (!choix.options.length) for (const [k, m] of Object.entries(MILIEUX)) { const o = el("option", null, m.long); o.value = k; choix.appendChild(o); }
    choix.value = R.milieu;
    document.getElementById("rv-milieu-aide").textContent = MILIEUX[R.milieu].aide;
    document.getElementById("rv-carte-modes").hidden = !R.plusieursModes;
    document.getElementById("rv-carte-faits").classList.toggle("demi", R.plusieursModes);
    choixMode("rv-mode");
    rendreActivites(R);
    rendreAutresRevenus();
    const g = R.rev, autres = R.modes.filter(m => m !== R.mode);
    const meilleur = autres.reduce((a, m) => g[m].total > g[a].total ? m : a, autres[0]);
    const diff = meilleur ? g[R.mode].total - g[meilleur].total : 0;
    hero("rv-hero", "Revenu brut de l'année", $(g[R.mode].total), [
      `Net après impôt${g[R.mode].fraisCabinet ? " et frais" : ""} : ${$(R.nets[R.mode])}`,
      meilleur ? puce(`${signe(diff)} par rapport ${AU_MODE[meilleur]}`, diff >= 0 ? "haut" : "bas", diff >= 0)
        : g.activites ? puce(`Dont ${$(g.activites)} d'activités en établissement`) : null,
    ], g[R.mode].total);

    if (R.plusieursModes) {
      const comp = document.getElementById("rv-comparaison"); comp.textContent = ""; comp.className = "barres";
      const max = Math.max(...R.modes.map(m => g[m].total), 1);
      R.modes.forEach(k => {
        const b = el("div", "barre-bloc");
        const tete = el("div", "barre-tete");
        const nom = el("span", "barre-nom", NOM_MODE[k]);
        if (R.mode === k) nom.appendChild(el("span", "etiquette-choix", "Utilisé dans le budget"));
        tete.append(nom, el("span", "barre-total", $(g[k].total)));
        const piste = el("div", "barre-piste"); const barre = el("div", "barre");
        const sp = el("span"); sp.style.background = R.mode === k ? "var(--encre)" : "var(--trait)"; barre.appendChild(sp);
        barre.style.width = (g[k].total / max * 100) + "%";
        piste.appendChild(barre);
        const fr = g[k].fraisCabinet ? `Frais de cabinet : ${moins(g[k].fraisCabinet)} · ` : "";
        b.append(tete, piste, el("div", "aide", R.societeActive
          ? `${fr}Pour vous : ${$(R.nets[k])} · laissé dans la société : ${$(R.impots[k].societe.retenu)}`
          : `${fr}Net après impôt${fr ? " et frais" : ""} : ${$(R.nets[k])}`));
        comp.appendChild(b);
      });
      comp.appendChild(rangees(el("div"), autres.map((m, i) => ({ titre: `${NOM_MODE[m]} par rapport ${AU_MODE[R.mode]}`,
        sous: R.societeActive ? `Laissé dans la société : ${signe(R.impots[m].societe.retenu - R.impots[R.mode].societe.retenu)}` : `Après impôt et frais : ${signe(R.nets[m] - R.nets[R.mode])}`,
        valeur: signe(g[m].total - g[R.mode].total), cls: i === 0 ? "total" : null }))));
      document.getElementById("rv-seuil").textContent = [
        g.seuilPatients != null ? `En clinique, le mixte paie plus que l'horaire au-delà de ${nb(g.seuilPatients)} patients par demi-journée` : "Sans pourcentage sur les visites, le mixte paie toujours moins en clinique",
        g.seuilActe != null ? ` ; l'acte, au-delà de ${nb(g.seuilActe)}.` : ".",
        ` Vous en voyez ${nb(S.revenu.patientsParDJ)}.`,
      ].join("");
    }

    rendreSensibilite(R);

    const parts = [
      ["Heures ou forfait horaire", x => x.heures ?? x.forfaitHoraire ?? 0],
      ["Visites", x => x.visites || 0],
      ["Intervention de supervision", x => x.supervision || 0],
      ["Demi-per diem de supervision", x => x.perDiem],
      ["Forfaits d'inscription", x => x.forfaitInscription + x.forfaitVulnerable],
      ["Forfait GMF", x => x.forfaitGmf || 0],
      ["Suppléments sans médecin", x => x.supplements],
      ["Volume de patients", x => x.volume || 0],
      ["Activités en établissement", x => x.activites || 0],
      ["Pratique polyvalente", x => x.polyvalence || 0],
      ["Autres revenus", x => x.autres],
    ];
    const zone = document.getElementById("rv-barres"); zone.textContent = ""; zone.className = "barres";
    const maxB = Math.max(...R.modes.map(m => g[m].total), 1);
    R.modes.forEach(k => {
      const x = g[k], b = el("div", "barre-bloc"), tete = el("div", "barre-tete");
      tete.append(el("span", "barre-nom", NOM_MODE[k]), el("span", "barre-total", $(x.total)));
      const piste = el("div", "barre-piste"), barre = el("div", "barre");
      barre.style.width = (x.total / maxB * 100) + "%";
      parts.forEach(([n, f], i) => { const v = f(x); if (v > 0) { const s = el("span"); s.style.flex = v + " 0 0"; s.style.background = SERIES[i % SERIES.length]; s.title = `${n} : ${$(v)}`; barre.appendChild(s); } });
      piste.appendChild(barre); b.append(tete, piste); zone.appendChild(b);
    });
    const lg = document.getElementById("rv-legende"); lg.textContent = "";
    parts.forEach(([n, f], i) => { if (R.modes.some(m => f(g[m]) > 0)) { const sp = el("span"); const k = el("i"); k.style.background = SERIES[i % SERIES.length]; sp.append(k, document.createTextNode(n)); lg.appendChild(sp); } });
    lignes(document.getElementById("rv-detail"), ["", ...R.modes.map(m => R.plusieursModes ? COURT_MODE[m] : "Par année")], [
      ...parts.filter(([, f]) => R.modes.some(m => f(g[m]) > 0)).map(([n, f]) => ({ cellules: [n, ...R.modes.map(m => $(f(g[m])))] })),
      { cls: "total", cellules: ["Total brut", ...R.modes.map(m => $(g[m].total))] },
      ...(R.modes.some(m => g[m].fraisCabinet > 0) ? [{ cls: "sous", cellules: ["Frais de cabinet", ...R.modes.map(m => moins(g[m].fraisCabinet))] }] : []),
    ]);
    const srv = S.revenu.demiJourneesSRV * S.revenu.patientsSRV * S.revenu.semaines;
    const auDela = R.modes.includes("horaire") && g.heuresAuDela > 0;
    const sousVisites = [srv ? `${nb(srv, 0)} en sans rendez-vous` : "", g.visitesApprenants ? `${nb(g.visitesApprenants, 0)} vues par les apprenants` : ""].filter(Boolean).join(", ");
    rangees("rv-faits", [
      { titre: "Heures en clinique", sous: auDela ? `Au taux horaire, ${nb(g.heuresAuDela, 0)} h au-delà de ${nb(g.plafondHeures, 0)} h sont payées à 71,8 % (annexe XIV)` : null, valeur: nb(g.heures, 0) + " h" },
      { titre: "Visites en clinique", sous: sousVisites ? `Dont ${sousVisites}` : null, valeur: nb(g.nbVisites, 0) },
      { titre: "Tarif moyen d'une visite de rendez-vous", sous: "À l'acte, à 100 % du tarif", valeur: $2(g.tarifMoyenRdv) },
      srv ? { titre: "Tarif moyen d'un patient au sans rendez-vous", sous: `Visite ponctuelle : ${nb(S.revenu.pctSrvComplexe || 0)} % complexes`, valeur: $2(g.tarifMoyenSrv) } : null,
      { titre: "Visites de prise en charge", valeur: nb(g.nbPriseEnCharge, 0) },
      { titre: "Patients inscrits", sous: "Du début à la fin de l'année", valeur: `${nb(g.inscritsDepart, 0)} → ${nb(g.inscritsFin, 0)}` },
      { titre: "Semaines au tarif de 500 patients et plus", valeur: `${g.semainesPalierHaut} sur ${S.revenu.semaines}` },
      g.detailActivites.length ? { titre: "Jours d'activités en établissement", valeur: nb(g.detailActivites.reduce((t, x) => t + x.jours, 0), 0) } : null,
      g.detailActivites.length ? { titre: "Majoration de la pratique polyvalente", sous: g.pctPolyvalence ? `Sur l'urgence, l'hospitalisation, l'obstétrique, les soins palliatifs et le CHSLD : ${$(g.polyvalence)}` : `Selon vos inscrits au 31 décembre${g.anneePratique < 5 ? ` (seuils de la ${g.anneePratique}${g.anneePratique === 1 ? "re" : "e"} année de pratique)` : ""}`, valeur: nb(g.pctPolyvalence, 1) + " %" } : null,
      g.detailVolume.total ? { titre: "Montants liés au volume de patients", sous: "Versés en juin de l'année suivante (EP 40, par. 4.15 et 15.01)", valeur: $(g.detailVolume.total) } : null,
    ]);
  }

  // Dépenses professionnelles déductibles : un total, ou le détail ligne par ligne.
  function rendreDepensesPro() {
    const z = document.getElementById("im-pro"), detail = S.impot.depensesProMode === "detail";
    const l = detail ? S.impot.depensesProDetail.filter(x => annuelLigne(x) > 0) : [];
    rangees(z, [
      ...l.map(x => ({ titre: ITEMS_PRO.get(x.k).nom, valeur: $(annuelLigne(x)), action: feuilleDepensesPro })),
      { titre: detail ? "Total" : "Total estimé", sous: R.societeActive ? "Payées par la société" : "Déduites du revenu imposable", cls: "total", valeur: $(R.depensesPro), action: feuilleDepensesPro },
    ]);
  }
  function feuilleDepensesPro() { ouvrirFeuille("Dépenses professionnelles", construireDepensesPro); }
  function construireDepensesPro(c) {
    const total = el("div", "feuille-total"); c.appendChild(total);
    feuilleCourante.maj = () => { total.textContent = ""; total.append(el("span", null, "Total par année"), el("strong", null, $(R ? R.depensesPro : 0))); };
    feuilleCourante.maj();
    const choix = el("div", "segment petit"); choix.id = "pro-mode"; c.appendChild(choix);
    segment("pro-mode", [["total", "Un total"], ["detail", "Ligne par ligne"]], S.impot.depensesProMode === "detail" ? "detail" : "total", v => {
      // Passer au détail : on garde le même total (cotisation du Collège, puis le reste en « Autres »).
      if (v === "detail" && !S.impot.depensesProDetail.some(x => x.montant > 0)) {
        const t = S.impot.depensesPro || 0, cmq = Math.min(1930, t);
        S.impot.depensesProDetail.find(x => x.k === "cmq").montant = cmq;
        S.impot.depensesProDetail.find(x => x.k === "autres").montant = t - cmq;
      }
      S.impot.depensesProMode = v; S.meta.exemple = false; sauver(); reconstruireFeuille(); tout();
    }, "Total ou détail");
    if (S.impot.depensesProMode !== "detail") {
      const gr = el("div", "groupe");
      gr.appendChild(creerChamp({ l: "Total par année", u: "$/an", s: 100 }, "pro-total", inp => { inp.dataset.p = "impot.depensesPro"; }, false));
      c.appendChild(gr);
      c.appendChild(el("p", "aide", "Collège des médecins, FMOQ, ACPM, formation, équipement, abonnements… Choisissez « Ligne par ligne » pour les détailler et optimiser."));
      return;
    }
    c.appendChild(el("p", "aide", "Montant et période. Déductibles du revenu imposable ; payées par la société si vous êtes incorporé(e)."));
    S.impot.depensesProDetail.forEach((x, i) => {
      const it = ITEMS_PRO.get(x.k), l = el("div", "ligne-depense ligne-revenu" + (x.montant > 0 ? " remplie" : ""));
      const nom = el("label", null, it.nom); nom.htmlFor = `dp-${x.k}`;
      const bm = el("div", "saisie"), m = el("input"); m.type = "number"; m.step = "1"; m.min = "0"; m.inputMode = "decimal"; m.value = x.montant || ""; m.placeholder = "0"; m.id = `dp-${x.k}`;
      lierListe("depensesPro", i, "montant")(m); bm.append(m, el("span", "unite", "$"));
      const bp = el("div", "saisie"), per = el("select"); [["an", "/ an"], ["mois", "/ mois"]].forEach(([v, t]) => { const o = el("option", null, t); o.value = v; per.appendChild(o); });
      per.value = x.periode; per.setAttribute("aria-label", "Période : " + it.nom); lierListe("depensesPro", i, "periode")(per); bp.appendChild(per);
      l.append(nom, bm, bp, el("span"), el("span"));
      if (it.aide) l.appendChild(el("p", "aide ligne-aide", it.aide));
      c.appendChild(l);
    });
  }

  // Autres revenus : les lignes inscrites ; Modifier ouvre toutes les sources possibles.
  function rendreAutresRevenus() {
    const z = document.getElementById("rv-autres"), l = S.revenu.lignes.filter(x => annuelLigne(x) > 0);
    if (!l.length) { z.textContent = ""; z.appendChild(el("p", "aide", "Formulaires et services non assurés, expertises, activités médico-administratives, enseignement, location, placements… Touchez Modifier pour les ajouter.")); return; }
    rangees(z, [
      ...l.map(x => ({ titre: nomLigne(x), sous: estPro(x) ? "Revenu professionnel" : "Imposable, sans RRQ ni RQAP", valeur: $(annuelLigne(x)), valeurSous: "par année", action: feuilleAutresRevenus })),
      l.length > 1 ? { titre: "Total des autres revenus", cls: "total", valeur: $(l.reduce((t, x) => t + annuelLigne(x), 0)) } : null,
    ]);
  }
  function feuilleAutresRevenus() { ouvrirFeuille("Autres revenus", construireAutresRevenus); }
  function construireAutresRevenus(c) {
    const total = el("div", "feuille-total"); c.appendChild(total);
    feuilleCourante.maj = () => { total.textContent = ""; total.append(el("span", null, "Total par année"), el("strong", null, $(S.revenu.lignes.reduce((t, x) => t + annuelLigne(x), 0)))); };
    feuilleCourante.maj();
    c.appendChild(el("p", "aide", "Montant et période. Les revenus professionnels s'ajoutent à la pratique (impôt, RRQ, RQAP) ; la location et les placements sont imposables, sans RRQ ni RQAP. Laissez 0 ce qui ne s'applique pas."));
    S.revenu.lignes.forEach((x, i) => {
      const l = el("div", "ligne-depense ligne-revenu" + (x.montant > 0 ? " remplie" : ""));
      let nom;
      if (x.k) { nom = el("label", null, nomLigne(x)); nom.htmlFor = `rl-${x.id}`; nom.title = ITEMS_REVENUS.get(x.k).aide; }
      else { nom = el("input"); nom.type = "text"; nom.value = x.nom; nom.setAttribute("aria-label", "Nom du revenu"); lierListe("lignes", i, "nom")(nom); }
      const bm = el("div", "saisie"), m = el("input"); m.type = "number"; m.step = "1"; m.min = "0"; m.inputMode = "decimal"; m.value = x.montant || ""; m.placeholder = "0"; m.id = `rl-${x.id}`;
      lierListe("lignes", i, "montant")(m); if (!x.k) m.setAttribute("aria-label", "Montant : " + x.nom); bm.append(m, el("span", "unite", "$"));
      const bp = el("div", "saisie"), per = el("select"); [["an", "/ an"], ["mois", "/ mois"]].forEach(([v, t]) => { const o = el("option", null, t); o.value = v; per.appendChild(o); });
      per.value = x.periode; per.setAttribute("aria-label", "Période : " + nomLigne(x)); lierListe("lignes", i, "periode")(per); bp.appendChild(per);
      let bt = el("span");
      if (!x.k) { bt = el("div", "saisie"); const t = el("select"); [["true", "Professionnel"], ["false", "Autre"]].forEach(([v, tx]) => { const o = el("option", null, tx); o.value = v; t.appendChild(o); });
        t.value = String(x.pro !== false); t.setAttribute("aria-label", "Type de revenu : " + x.nom); t.dataset.l = "lignes"; t.dataset.i = i; t.dataset.k = "pro"; t.dataset.bool = "1"; bt.appendChild(t); }
      l.append(nom, bm, bp, bt);
      if (!x.k) { const s2 = el("button", "supprimer", "×"); s2.type = "button"; s2.setAttribute("aria-label", "Supprimer : " + x.nom); s2.dataset.suppr = "lignes"; s2.dataset.i = i; l.appendChild(s2); } else l.appendChild(el("span"));
      if (x.k) { const a = el("p", "aide ligne-aide", ITEMS_REVENUS.get(x.k).aide); l.appendChild(a); }
      c.appendChild(l);
    });
    const a = el("div", "feuille-actions"), b = el("button", "bouton secondaire large", "Ajouter un revenu"); b.type = "button";
    b.addEventListener("click", () => {
      S.revenu.lignes.push({ id: nouvelId("r"), k: null, nom: "Nouveau revenu", montant: 0, periode: "an", pro: true });
      sauver(); reconstruireFeuille(); tout();
      const champs = corps.querySelectorAll('.ligne-revenu input[type="text"]'); if (champs.length) { champs[champs.length - 1].focus(); champs[champs.length - 1].select(); }
    });
    a.appendChild(b); c.appendChild(a);
  }

  // Activités en établissement : une rangée par activité, revenu de l'année ; touchez pour modifier.
  const FREQUENCES = { semaine: "par semaine", mois: "par mois", annee: "par année" };
  const unite = a => (ACTIVITES[a.type] || ACTIVITES.autre).unite === "quart" ? "quart" : "jour";
  const frequenceTexte = a => `${nb(a.nombre)} ${unite(a)}${a.nombre > 1 ? "s" : ""} ${a.frequence === "cycle" ? `toutes les ${nb(a.cycle)} semaines` : FREQUENCES[a.frequence] || ""}`;
  function rendreActivites(R) {
    const z = document.getElementById("rv-activites");
    const liste = S.revenu.activites || [];
    if (!liste.length) { z.textContent = ""; z.appendChild(el("p", "aide", "Aucune activité. Urgence, hospitalisation, obstétrique, soins palliatifs, CHSLD, gardes : ajoutez celles que vous faites en plus de votre pratique principale.")); return; }
    rangees(z, [
      ...liste.map((a, i) => { const x = R.rev.detailActivites[i];
        return { titre: nomActivite(a), sous: `${frequenceTexte(a)} · ${a.calcul === "patients" ? `${nb(a.patients)} patients × ${$(a.parPatient)}` : `${$(x.parJour)} par ${unite(a)}`}`,
          valeur: $(x.total), valeurSous: `${nb(x.jours, 0)} ${unite(a)}s par année`, action: () => feuilleActivite(i) }; }),
      liste.length > 1 ? { titre: "Total des activités", cls: "total", valeur: $(R.rev.activites) } : null,
    ]);
  }
  const CHAMPS_ACTIVITE = [
    { k: "type", l: "Activité", t: "select", o: Object.entries(ACTIVITES).map(([k, a]) => [k, a.nom]) },
    { k: "nom", l: "Nom (facultatif)", t: "text" },
    { k: "nombre", l: "Nombre de jours ou de quarts", u: "j.", s: 0.5 },
    { k: "frequence", l: "Fréquence", t: "select", o: [["semaine", "Par semaine"], ["mois", "Par mois"], ["annee", "Par année"], ["cycle", "Toutes les … semaines"]] },
    { k: "cycle", l: "Toutes les", u: "sem.", s: 1, seul: a => a.frequence === "cycle" },
    { k: "calcul", l: "Revenu calculé à partir de", t: "select", o: [["jour", "Un revenu brut par jour (ou quart)"], ["patients", "Patients par jour × revenu par patient"]] },
    { k: "parJour", l: "Revenu brut par jour (ou quart)", u: "$", s: 50, seul: a => a.calcul !== "patients", h: "Valeur de départ indicative : remplacez-la par la vôtre (collègues, relevés de la RAMQ)." },
    { k: "patients", l: "Patients par jour", u: "pat.", s: 1, seul: a => a.calcul === "patients" },
    { k: "parPatient", l: "Revenu moyen par patient", u: "$", s: 5, seul: a => a.calcul === "patients", h: "Visites, prises en charge et suppléments, en moyenne. Estimation à préciser avec vos relevés." },
  ];
  function feuilleActivite(i) {
    ouvrirFeuille(nomActivite(S.revenu.activites[i]), c => {
      const g2 = el("div", "groupe"); g2.appendChild(el("h3", null, "Sur une année"));
      const infos = el("div", "rangees"); g2.appendChild(infos); c.appendChild(g2);
      feuilleCourante.maj = () => { const x = R && R.rev.detailActivites[i]; if (x) rangees(infos, [
        { titre: "Jours ou quarts", valeur: nb(x.jours, 1) }, { titre: "Revenu brut par jour", valeur: $(x.parJour) }, { titre: "Revenu brut de l'année", cls: "total", valeur: $(x.total) }]); };
      feuilleCourante.maj();
      c.appendChild(el("div", "groupe")).appendChild(el("h3", null, "Activité"));
      champsActivite(c, i);
      const ac = el("div", "feuille-actions");
      const x = el("button", "bouton danger large", "Retirer cette activité"); x.type = "button"; x.dataset.suppr = "activites"; x.dataset.i = i;
      ac.appendChild(x); c.appendChild(ac);
    });
  }
  function champsActivite(c, i) {
    const a = S.revenu.activites[i];
    for (const ch of CHAMPS_ACTIVITE) {
      if (ch.seul && !ch.seul(a)) continue;
      let ligne;
      if (ch.t === "text") {
        ligne = el("div", "champ large"); const lab = el("label", null, ch.l); lab.htmlFor = `ac-${a.id}-nom`;
        const boite = el("div", "saisie"), inp = el("input"); inp.type = "text"; inp.id = `ac-${a.id}-nom`; inp.value = a.nom || ""; inp.placeholder = (ACTIVITES[a.type] || ACTIVITES.autre).nom;
        lierListe("activites", i, "nom")(inp); boite.appendChild(inp); ligne.append(lab, boite, el("span"));
      } else {
        ligne = creerChamp(ch, `ac-${a.id}-${ch.k}`, lierListe("activites", i, ch.k), false);
        const inp = ligne.querySelector("input, select"); inp.value = a[ch.k] ?? "";
      }
      c.appendChild(ligne);
    }
  }
  function ajouterActivite() {
    const d = ACTIVITES.urgence;
    S.revenu.activites = S.revenu.activites || [];
    S.revenu.activites.push({ id: nouvelId("a"), type: "urgence", nom: "", nombre: 4, frequence: "mois", cycle: 6, calcul: "jour", parJour: d.parJour, patients: d.patients, parPatient: d.parPatient });
    S.meta.exemple = false; sauver(); tout();
    feuilleActivite(S.revenu.activites.length - 1);
  }

  // Selon le nombre de demi-journées et de patients : brut ou net, pour chaque mode (ou brut et net s'il n'y en a qu'un).
  function rendreSensibilite(R) {
    segment("rv-sens-vue", [["net", "Net"], ["brut", "Brut"]], U.sensVue, v => { U.sensVue = v; tout(); }, "Montants bruts ou nets");
    const net = U.sensVue === "net", val = (x, md) => net ? x[md + "Net"] : x[md];
    const dj = S.revenu.demiJournees, pat = S.revenu.patientsParDJ, ens = R.milieu === "gmfu" ? S.revenu.enseignement : 0;
    graphiqueLignes(document.getElementById("rv-sens-graph"), document.getElementById("rv-sens-legende"),
      R.modes.map(md => ({ nom: NOM_MODE[md], couleur: COULEUR_MODE[md], valeurs: R.sensDJ.map(x => val(x, md)) })),
      R.sensDJ.map(x => String(x.v)), { titre: `Revenu ${net ? "net" : "brut"} selon les demi-journées par semaine`, baseLibre: true, hauteur: 200,
      titreX: i => `${R.sensDJ[i].v} demi-journées par semaine` });
    const cols = R.plusieursModes ? R.modes.map(m => COURT_MODE[m]) : ["Brut", R.societeActive ? "Pour vous" : "Net"];
    const cellules = x => R.plusieursModes ? R.modes.map(md => $(val(x, md))) : [$(x[R.mode]), $(x[R.mode + "Net"])];
    const ligneSens = (x, actuel, nom) => ({ cls: actuel ? "choisi" : null, cellules: [nom, ...cellules(x)] });
    lignes(document.getElementById("rv-sens-dj"), ["Demi-journées", ...cols], R.sensDJ.map(x => ligneSens(x, x.v === dj, `${x.v}${x.v === dj ? " (vous)" : ""}`)));
    lignes(document.getElementById("rv-sens-pat"), ["Patients", ...cols], R.sensPat.map(x => ligneSens(x, x.v === pat, `${nb(x.v)}${x.v === pat ? " (vous)" : ""}`)));
    const notePrefixe = net ? (R.societeActive ? "Net pour vous : dividendes après impôt ; le reste demeure dans la société." : "Après impôt et cotisations, avec vos déductions.") : "Avant impôt.";
    document.getElementById("rv-sens-note").textContent = `${notePrefixe} Demi-journées de rendez-vous${ens ? `, dont ${nb(ens)} d'enseignement` : ""}, à ${nb(pat)} patients chacune ; le sans rendez-vous et les activités restent les mêmes.${R.modes.includes("horaire") ? " Au taux horaire, le nombre de patients ne change pas le revenu." : ""}`;
  }

  function rendreImpot(R) {
    const soc = R.societeActive, t = R.impot.totalGlobal ?? R.impot.total, perso = R.impot.total;
    choixMode("im-mode");
    hero("im-hero", soc ? "Impôt de l'année : société et vous" : "Impôt et cotisations de l'année", $(t), [
      puce(`Taux moyen ${pct(R.impot.tauxMoyen, 0)}`), puce(`Taux marginal ${pct(R.tauxMarginal, 0)}`),
    ], t);

    // Sur chaque 100 $ gagnés : où va le revenu brut.
    const brut = Math.max(1, R.impot.revenu), cotis = R.impot.rrq + R.impot.rqap + R.impot.fss;
    const dpro = Math.min(R.dproPerso, brut), x = R.impot.societe;
    const morceaux = soc
      ? [["Impôt de la société", x.impotSociete, SERIES[0]], ["Votre impôt sur les dividendes", R.impot.fed + R.impot.qc + R.impot.fss, SERIES[1]],
         ["Dépenses et frais de la société", x.depenses + x.frais, SERIES[3]], ["Laissé dans la société", x.retenu, SERIES[5]], ["Reste pour vous", R.impot.net, SERIES[4]]]
      : [["Impôt fédéral", R.impot.fed, SERIES[0]], ["Impôt du Québec", R.impot.qc, SERIES[1]], ["RRQ, RQAP et Fonds des services de santé", cotis, SERIES[2]],
         [R.rev[R.mode].fraisCabinet ? "Dépenses et frais de cabinet" : "Dépenses professionnelles", dpro, SERIES[3]], ["Reste pour vous", R.impot.net - dpro, SERIES[4]]];
    const cent = document.getElementById("im-cent"); cent.textContent = "";
    const barre = el("div", "flux-barre"); barre.setAttribute("role", "img");
    barre.setAttribute("aria-label", morceaux.map(([n, v]) => `${n} ${$2(v / brut * 100)}`).join(", "));
    morceaux.forEach(([n, v, c]) => { if (v > 0) { const sp = el("span"); sp.style.flex = `${v} 0 0`; sp.style.background = c; sp.title = n; barre.appendChild(sp); } });
    cent.appendChild(barre);
    cent.appendChild(rangees(el("div"), morceaux.map(([n, v, c]) => ({ titre: n, couleur: c, valeur: $2(v / brut * 100), valeurSous: $(v) + " par année" }))));

    const a = document.getElementById("im-acomptes"); a.textContent = "";
    a.appendChild(el("p", "resume", soc
      ? `La société garde environ ${$(x.impotSociete / 12)} par mois pour son impôt. Vous, mettez de côté environ ${$(perso / 12)} par mois pour l'impôt sur vos dividendes. Votre taux marginal, société comprise, est de ${pct(R.tauxMarginal, 0)}.`
      : `Mettez de côté ${pct(t / Math.max(1, R.brut), 0)} de chaque paiement de la RAMQ, soit environ ${$(t / 12)} par mois. Votre taux marginal de ${pct(R.tauxMarginal, 0)} est l'impôt sur chaque dollar de plus facturé${Math.abs(R.tauxDeduction - R.tauxMarginal) > 0.01 ? `, après les frais de cabinet ; chaque dollar cotisé au REER vous rapporte ${pct(R.tauxDeduction, 0)}` : ", et ce que rapporte chaque dollar cotisé au REER"}.`));
    const premiere = S.revenu.annee === "premiere";
    const an = (+String(S.strategie.debut).slice(0, 4) || 2026) + 1;
    a.appendChild(rangees(el("div"), [
      soc && { titre: "Société : acomptes mensuels", sous: "Impôt de la société, le dernier jour de chaque mois", valeur: $(x.impotSociete / 12), valeurSous: "par mois" },
      ...(premiere
        ? [{ titre: `30 avril ${an}`, sous: "Solde de votre impôt de la première année", valeur: $(perso), ico: "!" },
           { titre: `Puis acomptes de ${an}`, sous: "15 mars, 15 juin, 15 septembre et 15 décembre", valeur: $(perso / 4), valeurSous: "chacun" }]
        : ["15 mars", "15 juin", "15 septembre", "15 décembre"].map(d => ({ titre: d, sous: "Votre acompte provisionnel", valeur: $(perso / 4) }))),
    ]));
    a.appendChild(el("p", "aide", premiere
      ? "La première année, l'impôt de l'année précédente (résidence) était faible : aucun acompte n'est exigé. Tout le solde arrive le 30 avril, et les acomptes commencent l'année suivante."
      : "Acomptes trimestriels, calculés sur l'impôt de l'année. Payer les montants que l'Agence du revenu et Revenu Québec vous envoient évite les intérêts."));

    // Détail selon le mode : une colonne par mode de rémunération (une seule au calcul simple).
    const I3 = R.modes.map(md => R.impots[md]), ligne = (nom, f, cls) => ({ cls, cellules: [nom, ...I3.map(f)] });
    document.getElementById("im-tableau-titre").textContent = R.plusieursModes ? "Détail selon le mode" : "Détail de l'impôt";
    lignes(document.getElementById("im-tableau"), ["", ...R.modes.map(m => R.plusieursModes ? COURT_MODE[m] : "Par année")], [
      ligne(soc ? "Revenu brut, versé à la société" : "Revenu brut", x => $(x.revenu)),
      ...(soc ? [
        ligne("Dépenses et frais de la société", x => moins(x.societe.depenses + x.societe.frais)),
        ligne("Impôt de la société", x => moins(x.societe.impotSociete)),
        ligne("Dividendes versés", x => $(x.societe.dividendes)),
        ligne("Laissé dans la société", x => $(x.societe.retenu), "sous"),
      ] : [
        ...(R.modes.some(md => R.rev[md].fraisCabinet > 0) ? [{ cellules: ["Frais de cabinet", ...R.modes.map(md => moins(R.rev[md].fraisCabinet))] }] : []),
        ligne("Revenu imposable", x => $(x.imposable), "sous"),
      ]),
      ligne("Impôt fédéral", x => $(x.fed)),
      ligne("Impôt du Québec", x => $(x.qc)),
      ...(soc ? [] : [ligne("RRQ (deux parts)", x => $(x.rrq)), ligne("RQAP", x => $(x.rqap))]),
      ligne("Fonds des services de santé", x => $(x.fss)),
      ...(R.couple && I3.some(x => x.transferts > 0) ? [ligne(`Crédits transférés par ${votreP()}`, x => moins(x.transferts))] : []),
      { cls: "total", cellules: [soc ? "Net pour vous" : "Net après impôt et frais", ...R.modes.map(md => $(R.nets[md]))] },
      ligne(soc ? "Taux moyen, société comprise" : "Taux moyen", x => pct(x.tauxMoyen), "sous"),
    ]);
    document.getElementById("im-tableau-note").textContent = soc
      ? "Pratique incorporée : la société paie les dépenses, les frais et son impôt, puis vous verse des dividendes non déterminés (majorés de 15 %, avec crédit d'impôt pour dividendes). Pas de RRQ ni de RQAP sur les dividendes, donc pas de rente RRQ ni de droits REER pour ces revenus. Crédit pour les intérêts d'un prêt étudiant et déduction REER inclus."
      : "Travail autonome, sans société : impôt fédéral (après l'abattement du Québec), impôt du Québec, RRQ des deux parts, RQAP et Fonds des services de santé. Crédits de base, crédit pour les intérêts d'un prêt de l'aide financière aux études, déduction REER et dépenses professionnelles.";
    document.getElementById("im-societe").closest(".carte").hidden = soc;

    rendreFamille(R);
    rendreDepensesPro();
    rendreVerification();

    const s = R.societe, z = document.getElementById("im-societe"); z.textContent = "";
    z.appendChild(el("p", "resume", s.reportAnnuel > 0
      ? `Avec une société, vous paieriez environ ${$(s.reportAnnuel)} de moins cette année, après ${$(S.societe.fraisSociete)} de frais. C'est un report : les ${$(s.societe.retenu)} laissés dans la société seront imposés quand vous les retirerez.`
      : `Une société ne réduirait pas votre impôt cette année : presque tout votre revenu sert au ménage et aux dettes, et les frais (${$(S.societe.fraisSociete)}) dépassent le report possible.`));
    tableauSimple(z, ["", "Particulier", "Société"], [
      { cellules: ["Besoin net (votre part, dettes et épargne)", $(R.besoinNet), $(R.besoinNet)] },
      { cellules: ["Impôt de la société", "—", $(s.societe.impotSociete)] },
      { cellules: ["Dividendes versés", "—", $(s.societe.dividendes)] },
      { cellules: ["Impôt personnel et cotisations", $(s.particulier.impot), $(s.societe.impotPerso)] },
      { cellules: ["Frais de la société", "—", $(s.societe.fraisSociete)] },
      { cls: "total", cellules: ["Impôt total cette année", $(s.particulier.impot), $(s.societe.impot + s.societe.fraisSociete)] },
      { cls: "sous", cellules: ["Laissé dans la société", "—", $(s.societe.retenu)] },
    ]);
    z.appendChild(el("p", "aide", "Hypothèses : rémunération en dividendes non déterminés seulement, donc pas de RRQ ni de droits REER. Le revenu ne peut pas être versé à une autre personne sans travail réel de sa part dans la société. À valider avec un comptable avant toute décision."));
  }

  function rendreFamille(R) {
    const z = document.getElementById("im-famille"); z.textContent = "";
    const f = R.famille, nEnf = R.ages.length;
    z.appendChild(el("p", "resume", (S.famille.calculAuto
      ? `Allocations familiales : ${$(R.allocations)} par année, soit ${$(R.allocations / 12)} par mois, sur un revenu net familial de ${$(R.netFedFamille)}${nEnf ? ` et ${nEnf} enfant${nEnf > 1 ? "s" : ""}` : ""}.`
      : `Allocations familiales : montant inscrit à la main, ${$(R.allocations)} par année.`) +
      (R.couple ? (S.famille.versementA === "conjointe" ? ` Elles sont versées à ${votreP()}.` : " Elles vous sont versées.") : "")));
    if (R.couple && !R.coupleFiscal) z.appendChild(el("p", "aide", `Conjoints de fait depuis moins de 12 mois, sans enfant commun : pour l'impôt de cette année, vous et ${votreP()} êtes imposés comme des personnes seules. Pas de transfert de crédits ; allocations et prime d'assurance médicaments selon le revenu de chacun. Dès l'an prochain, après 12 mois de vie commune, vous formerez un couple pour l'impôt : l'avenir en tient compte.`));
    if (S.famille.calculAuto) {
      if (!nEnf) z.appendChild(el("p", "aide", "Ajoutez les enfants et leur âge dans la page Patrimoine pour calculer les allocations."));
      else z.appendChild(rangees(el("div"), [
        { titre: "Allocation canadienne pour enfants", sous: "Fédéral", valeur: $(f.ace) },
        { titre: "Allocation famille", sous: "Québec", valeur: $(f.allocationFamille) },
        { titre: "Supplément pour fournitures scolaires", sous: "Québec, de 4 à 16 ans", valeur: $(f.fournitures) },
        { titre: "Total par année", cls: "total", valeur: $(f.total) },
      ]));
    }
    z.appendChild(el("h3", null, "Assurance médicaments"));
    z.appendChild(rangees(el("div"), [
      { titre: "Votre prime du régime public", sous: S.famille.medicamentsPublicMoi ? "Payée avec l'impôt du Québec" : "Assurance collective : pas de prime", valeur: $(R.primeMoi) },
      R.couple && { titre: `Prime de ${votreP()}`, sous: S.conjointe.medicamentsPublic ? "Payée avec l'impôt du Québec" : "Assurance collective : pas de prime", valeur: $(R.primeConjointe) },
    ]));
    z.appendChild(el("p", "aide", "La prime dépend du revenu net familial ; les enfants sont couverts sans prime."));
    if (!R.couple) return;
    const c = R.conjointe;
    z.appendChild(el("h3", null, `Impôt de ${votreP()}`));
    z.appendChild(rangees(el("div"), [
      { titre: R.autonomeP ? "Revenu d'entreprise et autres revenus" : "Salaire et autres revenus", valeur: $(c.revenu) },
      R.autonomeP && R.depensesPartenaire > 0 && { titre: "Dépenses d'entreprise", valeur: moins(R.depensesPartenaire) },
      { titre: "Impôt fédéral", valeur: moins(c.fed) },
      { titre: "Impôt du Québec", valeur: moins(c.qc) },
      { titre: R.autonomeP ? "RRQ (deux parts), RQAP et Fonds des services de santé" : "RRQ, RQAP et assurance-emploi", valeur: moins(c.rrq + c.rqap + c.ae + (c.fss || 0)) },
      !R.autonomeP && S.conjointe.rpa + S.conjointe.syndicat > 0 && { titre: "Régime de retraite et cotisations syndicales", valeur: moins(S.conjointe.rpa + S.conjointe.syndicat) },
      c.transferts > 0 && { titre: "Crédits transférés par vous", valeur: $(c.transferts) },
      { titre: R.autonomeP ? "Net après impôt et dépenses" : "Net après impôt", cls: "total", valeur: $(c.net - R.depensesPartenaire) },
    ]));
    const recu = R.impot.transferts + c.transferts;
    if (R.coupleFiscal) z.appendChild(el("p", "aide", recu > 0
      ? `Conjoints au sens de l'impôt : ${$(recu)} de crédits non utilisés passent de ${R.impot.transferts > 0 ? `${votreP()} à vous` : `vous à ${votreP()}`} (montant pour conjoint au fédéral, transfert de crédits au Québec).`
      : "Conjoints au sens de l'impôt : aucun crédit à transférer, chacun utilise ses propres crédits."));
  }

  // Refait les cas de l'outil officiel avec le calcul de WealthMorand et montre les écarts.
  const CHAMPS_VERIF = [["qc", "Impôt du Québec"], ["fed", "Impôt fédéral"], ["rrq", "RRQ"], ["rqap", "RQAP"], ["ae", "Assurance-emploi"],
    ["af", "Allocation famille"], ["fournitures", "Fournitures scolaires"], ["ace", "Allocation canadienne pour enfants"], ["prime", "Prime d'assurance médicaments"]];
  function casCalcul(v) {
    let a = C.impotSalarie({ salaire: v.salaires[0] }), b = v.couple ? C.impotSalarie({ salaire: v.salaires[1] }) : null;
    if (v.couple) [a, b] = C.transfertsConjoints(a, b);
    const somme = k => a[k] + (b ? b[k] : 0);
    const nf = somme("revenuNetFed"), nq = somme("revenuNetQc");
    const pf = C.prestationsFamille({ revenuNetFed: nf, revenuNetQc: nq, ages: v.ages, couple: v.couple });
    const pr = C.primeMedicaments({ revenuNetQc: nq, couple: v.couple, ages: v.ages, adultesCouverts: v.couple ? 2 : 1 });
    return { qc: somme("qc"), fed: somme("fed"), rrq: somme("rrq"), rqap: somme("rqap"), ae: somme("ae"), af: pf.allocationFamille, fournitures: pf.fournitures, ace: pf.ace, prime: pr.total };
  }
  function rendreVerification() {
    const z = document.getElementById("im-verif"); if (z.dataset.fait) return;
    z.dataset.fait = "1";
    const nomCas = v => (v.couple ? `Couple, ${v.salaires.map(s => $(s)).join(" + ")}` : `Personne seule, ${$(v.salaires[0])}`) +
      (v.ages.length ? `, enfants de ${v.ages.join(" et ")} ans` : "");
    let total = 0, egaux = 0, pire = { e: 0 };
    const cas = VERIFICATION.map(v => {
      const b = casCalcul(v);
      const ecarts = CHAMPS_VERIF.map(([k, n]) => { const e = Math.round(b[k]) - v.officiel[k]; total++; if (Math.abs(e) <= 1) egaux++; if (Math.abs(e) > Math.abs(pire.e)) pire = { e, n, cas: nomCas(v) }; return { n, e, off: v.officiel[k], nous: Math.round(b[k]) }; });
      return { v, ecarts };
    });
    const tete = el("div", "hero-sous");
    tete.append(puce(`${nb(egaux, 0)} sur ${nb(total, 0)} identiques`, "haut", true));
    z.append(tete, el("p", "resume", `WealthMorand refait ${VERIFICATION.length} cas de l'outil officiel du ministère des Finances du Québec : ${nb(egaux, 0)} montants sur ${nb(total, 0)} sont identiques, à 1 $ près.` +
      (pire.e ? ` Le plus grand écart est de ${$(Math.abs(pire.e))} (${pire.n.toLowerCase()}, ${pire.cas.charAt(0).toLowerCase() + pire.cas.slice(1)}).` : "")));
    z.appendChild(rangees(el("div"), cas.map(({ v, ecarts }) => {
      const max = ecarts.reduce((m, x) => Math.abs(x.e) > Math.abs(m) ? x.e : m, 0);
      return { titre: nomCas(v), sous: `${ecarts.filter(x => Math.abs(x.e) <= 1).length} sur ${ecarts.length} identiques`, valeur: max ? signe(max) : "Aucun écart" };
    })));
    const d = el("details", "plier"); d.appendChild(el("summary", null, "Voir chaque montant"));
    cas.forEach(({ v, ecarts }) => {
      d.appendChild(el("h4", null, nomCas(v)));
      tableauSimple(d, ["", "Officiel", "WealthMorand", "Écart"], ecarts.map(x => ({ cellules: [x.n, $(x.off), $(x.nous), x.e ? signe(x.e) : "—"] })));
    });
    z.appendChild(d);
    z.appendChild(el("p", "aide", "Outil de calcul du revenu disponible des familles (version de mai 2026, année 2026), consulté le 25 octobre 2026. L'outil ne traite que des revenus d'emploi : il valide les barèmes, les crédits, les transferts entre conjoints, les allocations et la prime d'assurance médicaments. Votre revenu de travailleur autonome (RRQ des deux parts, Fonds des services de santé) suit les mêmes barèmes, mais ne peut pas y être vérifié."));
  }

  function rendreBudget(R) {
    const cj = R.couple;
    if (!cj && U.vueBudget === "conjointe") U.vueBudget = "moi";
    segment("bu-vue", cj ? [["moi", "Vous"], ["conjointe", Pn()], ["menage", "Ménage"]] : [["moi", "Vous"], ["menage", "Ménage"]], U.vueBudget, v => { U.vueBudget = v; tout(); }, "Budget de qui");
    const vue = U.vueBudget, part = S.menage.partCommunMoi / 100;
    const qui = b => vue === "menage" ? 1 : vue === "moi" ? (b.qui === "moi" ? 1 : b.qui === "commun" ? part : 0) : (b.qui === "conjoint" ? 1 : b.qui === "commun" ? 1 - part : 0);
    const partDette = d => vue === "menage" ? 1 : vue === "moi" ? (d.paiementMoi ?? 100) / 100 : 1 - (d.paiementMoi ?? 100) / 100;
    const V = {
      moi: { travail: R.travailMoi, alloc: R.allocMoi, autres: 0, rev: R.netMoi, dep: R.depMoi, dettes: R.dettesMoi, epargne: R.epargneMoi, surplus: R.surplusMoi },
      conjointe: { travail: R.travailConjointe, alloc: R.allocConjointe, autres: 0, rev: R.netConjointe, dep: R.depConjointe, dettes: R.dettesConjointe, epargne: R.epargneConjointe, surplus: R.surplusConjointe },
      menage: { travail: R.travailMoi + R.travailConjointe, alloc: R.allocMoi + R.allocConjointe, autres: S.menage.autresRevenusMensuels, rev: R.revenusMenage, dep: R.depMenage, dettes: R.dettesMenage, epargne: R.epargneMoi + R.epargneConjointe, surplus: R.surplusMenage },
    }[vue];
    const nomVue = { moi: "Votre surplus mensuel", conjointe: `Surplus de ${votreP()}`, menage: "Surplus du ménage" }[vue];
    hero("bu-hero", nomVue, $(V.surplus), [
      `${$(V.rev)} de revenus, ${$(V.dep + V.dettes + V.epargne)} de sorties`,
      V.surplus < 0 && puce("Budget négatif", "bas", false),
    ], V.surplus);
    rangees("bu-revenus", [
      { titre: "Revenu net de travail", sous: vue === "conjointe" ? (S.conjointe.statut === "autonome" ? "Après impôt, cotisations et dépenses d'entreprise" : "Salaire après impôt et cotisations") : "Après impôt, prime d'assurance médicaments et dépenses pro", valeur: $(V.travail) },
      (R.allocations > 0 || vue !== "conjointe") && { titre: "Allocations familiales", sous: S.famille.calculAuto ? "Calculées selon vos revenus" : "Montant inscrit", valeur: $(V.alloc) },
      V.autres > 0 && { titre: "Autres revenus", valeur: $(V.autres) },
      { titre: "Total", cls: "total", valeur: $(V.rev) },
    ]);
    rendreAnnuelles(); rendreFlux(R); rendreReste(R); rendreBilanMois(R);
    // Dépenses : une rangée par catégorie ; toucher ouvre ses cases.
    const cats = [...CATALOGUE.map(x => x.cat), "Autres dépenses"];
    rangees("bu-depenses", [
      ...cats.map(g => {
        if (totalActif(g)) { const t = depensesEffectives().find(b => b.id === "total-" + g); const v = mensuel(t) * qui(t);
          return { titre: g, sous: "Total estimé", valeur: $(v), action: () => feuilleCategorie(g) }; }
        const l = S.budget.filter(b => categorie(b) === g);
        const n = l.filter(b => b.montant > 0).length;
        const v = l.reduce((s, b) => s + mensuel(b) * qui(b), 0);
        return { titre: g, sous: n ? `${n} dépense${n > 1 ? "s" : ""}` : "Rien d'inscrit", valeur: n ? $(v) : "—", cls: n ? null : "vide", action: () => feuilleCategorie(g) };
      }),
      { titre: vue === "conjointe" ? "Son épargne" : "Épargne : REEE, REER, CELI, objectifs", sous: vue === "conjointe" ? "Bouton Ménage" : vue === "menage" && R.epargneConjointe ? `La vôtre et celle de ${votreP()}` : "Page Patrimoine", valeur: $(V.epargne) },
      { titre: "Total des dépenses et de l'épargne", cls: "total", valeur: $(V.dep + V.epargne) },
    ]);
    rangees("bu-dettes", [
      ...S.dettes.map((d, i) => {
        const fin = R.sim.dettes[i] && R.sim.dettes[i].fin;
        return { titre: d.nom, sous: `${nb(d.taux, 2)} % · ${fin ? "remboursée en " + moisAn(fin) : "jamais remboursée"}`, valeur: $(d.solde), valeurSous: `${$(minimumDette(d) * partDette(d))} / mois`, action: () => feuilleDette(i) };
      }),
      { titre: "Ajouter une dette", ico: "plus", cls: "ajout", action: () => {
        S.dettes.push({ id: nouvelId("d"), nom: "Nouvelle dette", type: "pret", solde: 0, limite: 0, taux: 5, paiement: 0, frequence: "mois", interetsSeulement: false, finTerme: "", tauxRenouvellement: 0, dureeTerme: 5, privilege: 0, creditImpot: 0, partMoi: 100, paiementMoi: 100 });
        sauver(); tout(); feuilleDette(S.dettes.length - 1);
      } },
    ]);

    // Votre surplus au fil des ans : il va sur les dettes, puis il est placé.
    const nAns = Math.min(R.annees, 20), an0 = +String(S.strategie.debut).slice(0, 4) || new Date().getFullYear();
    const surplus = Array.from({ length: nAns + 1 }, (_, a) => R.surplusAnnee(a));
    graphiqueLignes(document.getElementById("bu-surplus-graph"), null, [{ nom: "Surplus mensuel", couleur: SERIES[0], valeurs: surplus }],
      surplus.map((_, a) => String(an0 + a)), { titre: "Votre surplus mensuel par année", aire: true, hauteur: 170, titreX: i => `${an0 + i}` });
    rangees("bu-surplus", [0, 1, 5, 10].filter(a => a <= nAns).map(a => ({
      titre: a === 0 ? "Cette année" : a === 1 ? "L'an prochain" : `Dans ${a} ans`, sous: String(an0 + a),
      valeur: $(surplus[a]), valeurSous: a === 0 ? (S.revenu.annee === "premiere" ? "Première année de pratique" : undefined) : signe(surplus[a] - surplus[0]),
    })));
    document.getElementById("bu-surplus-note").textContent = S.strategie.extraMode === "manuel"
      ? `Montant fixe de ${$(S.strategie.extraManuel)} par mois (Plan de remboursement, Modifier).`
      : `Scénario ${SCENARIOS[R.scenario].toLowerCase()} : revenus ${signePct(R.hyp.hausseRevenus)} et dépenses ${signePct(R.hyp.inflation)} par année, paliers d'impôt indexés. ${S.revenu.annee === "premiere" ? "Après la première année, la clientèle est complète toute l'année. " : ""}Les allocations suivent l'âge des enfants et les cotisations REEE cessent à 17 ans.`;

    const sim = R.sim;
    const res = document.getElementById("de-resume"); res.textContent = "";
    if (S.strategie.methode === "minimum") res.textContent = sim.libre ? `En payant seulement les minimums, vos dettes sont remboursées en ${moisAn(sim.libre)}.` : "En payant seulement les minimums, la marge de crédit n'est jamais remboursée : ses paiements ne couvrent que les intérêts.";
    else {
      res.append(document.createTextNode(`Avec ${$(R.extra)} de plus par mois${S.strategie.reerSurDettes && R.remboursementReer > 0 ? ` et ${$(R.remboursementReer)} chaque avril (REER)` : ""}, toutes les dettes sont remboursées en `));
      res.appendChild(el("strong", null, moisAn(sim.libre)));
      res.append(document.createTextNode(`, pour ${$(sim.interetsNetsTotaux)} d'intérêts au total, après les crédits d'impôt${sim.gainsAttente > 1 ? ` (moins ${$(sim.gainsAttente)} gagnés sur l'argent en attente d'un renouvellement)` : ""}.`));
    }
    res.append(document.createTextNode(` Scénario ${SCENARIOS[R.scenario].toLowerCase()} : revenus ${signePct(R.hyp.hausseRevenus)} et dépenses ${signePct(R.hyp.inflation)} par année${R.hyp.ecartTaux ? `, taux variables et renouvellements ${R.hyp.ecartTaux > 0 ? "+" : "−"}${nb(Math.abs(R.hyp.ecartTaux), 2)} point` : ""}.`));
    const sd = seriesDettes(sim, false);
    graphiqueLignes(document.getElementById("de-graph"), document.getElementById("de-legende"), sd.series, sd.etiquettes, { titre: "Soldes des dettes par année" });
    majSimulation();
    rangees("de-tableau", S.dettes.map((d, j) => {
      const x = sim.dettes[j], renouv = Math.abs(x.tauxFinal - d.taux) > 0.001;
      return { titre: d.nom, couleur: SERIES[j % SERIES.length],
        sous: `Taux réel ${nb(C.tauxReel(d), 2)} %${renouv ? ` · ${nb(x.tauxFinal, 2)} % ensuite` : ""}`,
        valeur: x.fin ? moisAn(x.fin) : "jamais", valeurSous: `${$(x.interetsNets)} d'intérêts nets` };
    }));
    // Choisir la méthode : chaque rangée se touche ; la recommandée maximise la valeur nette à l'horizon.
    const fin = R.vnMethodes[R.recommandee].annee;
    rangees("de-methodes", METHODES.map(k => {
      const s = R.sims[k], choisi = k === R.methode;
      return { titre: NOMS_METHODES[k] + (k === R.recommandee ? " · recommandée" : ""), ico: choisi ? "ok" : " ", cls: choisi ? "choisi" : null,
        sous: s.libre ? `Sans dettes en ${moisAn(s.libre)} · coût net ${$(s.coutNet)}` : "La marge n'est jamais remboursée",
        valeur: $(R.vnMethodes[k].moi), valeurSous: `valeur nette en ${fin}`,
        action: choisi ? null : () => changer("strategie.methode", k) };
    }));
    const plafond = nb(Math.max(0, ...S.dettes.filter(d => d.type === "hypotheque").map(d => d.privilege || 0)), 0);
    const ecartRec = R.vnMethodes[R.recommandee].moi - R.vnMethodes.avalanche.moi;
    const placer = R.vnMethodes.minimum.moi > R.vnMethodes[R.recommandee].moi;
    document.getElementById("de-methodes-note").textContent =
      (R.recommandee === "hybride"
        ? `L'hybride utilise d'abord, chaque année, le droit de remboursement anticipé des hypothèques (${plafond} % du solde, perdu au 1er janvier s'il n'est pas utilisé), puis paie la dette au taux réel le plus élevé. Ici, elle ajoute ${$(ecartRec)} à votre valeur nette en ${fin} par rapport à l'avalanche.`
        : R.recommandee === "boule" ? "Ici, la boule de neige donne la plus grande valeur nette : en réglant d'abord les petits soldes, elle utilise chaque année le droit de remboursement anticipé des hypothèques."
        : "Ici, l'avalanche donne la plus grande valeur nette : elle paie d'abord la dette au taux réel le plus élevé.") +
      (() => {
        const moinsChere = METHODES.filter(m => m !== "minimum").reduce((a, m) => R.sims[m].coutNet < R.sims[a].coutNet ? m : a, "avalanche");
        const rec = R.sims[R.recommandee], mc = R.sims[moinsChere];
        return moinsChere !== R.recommandee && rec.libre && mc.libre && rec.libre < mc.libre
          ? ` ${AVEC_ARTICLE[moinsChere].replace(/^./, c => c.toUpperCase())} coûte ${$(rec.coutNet - mc.coutNet)} de moins en intérêts, mais ${AVEC_ARTICLE[R.recommandee]} finit plus tôt (${moisAn(rec.libre)}) : l'argent libéré est placé plus vite.`
          : "";
      })() +
      " La date « sans dettes » suit les renouvellements : l'argent qui attend est placé à court terme (2,4 %) et compte dans la valeur nette." +
      (placer ? ` Placer le surplus au lieu de rembourser donnerait plus dans ce scénario (rendement de ${nb(R.hyp.rendement, 1)} %), mais ce rendement n'est pas garanti, contrairement à l'intérêt économisé.` : "");
  }

  // Et si vous ajoutiez un montant chaque mois ? Simulation rapide, sans changer vos données.
  function majSimulation() {
    const curseur = document.getElementById("de-ajout"), sortie = document.getElementById("de-ajout-texte");
    const ajout = +curseur.value;
    document.getElementById("de-ajout-valeur").textContent = `+${$(ajout)} par mois`;
    if (!R || S.strategie.methode === "minimum") { sortie.textContent = "Choisissez une méthode de remboursement accéléré pour simuler un ajout."; return; }
    if (!ajout) { sortie.textContent = `Glissez pour voir l'effet d'un montant de plus chaque mois, en plus de votre surplus.`; return; }
    const s = R.simulerAvecAjout(ajout), b = R.sim;
    const mois = s.libre && b.libre ? (b.libre.getFullYear() - s.libre.getFullYear()) * 12 + b.libre.getMonth() - s.libre.getMonth() : 0;
    sortie.textContent = s.libre
      ? `Sans dettes en ${moisAn(s.libre)}${mois > 0 ? `, ${mois >= 12 ? `${Math.floor(mois / 12)} an${mois >= 24 ? "s" : ""}${mois % 12 ? ` et ${mois % 12} mois` : ""}` : `${mois} mois`} plus tôt` : " (les renouvellements fixent la date)"}, et ${$(Math.max(0, b.coutNet - s.coutNet))} d'intérêts nets en moins.`
      : "Même avec cet ajout, la marge n'est jamais remboursée.";
  }

  function rendreAvenir(R) {
    const cj = R.couple;
    segment("vn-scenario", Object.entries(SCENARIOS), R.scenario, v => changer("scenarios.choisi", v), "Scénario");
    const h = R.hyp, hyp = document.getElementById("vn-hyp"); hyp.textContent = "";
    hyp.append(document.createTextNode(`Placements ${nb(h.rendement, 1)} %, maison ${signePct(h.croissanceMaison)}, autos −${nb(h.depreciationAuto, 0)} %, inflation ${nb(h.inflation, 1)} % par année. `));
    const lien = el("button", "lien-carte", "Modifier les hypothèses"); lien.type = "button"; lien.dataset.feuille = "hypotheses"; hyp.appendChild(lien);
    if (!cj) U.vueAvenir = "moi";
    if (cj) segment("vn-vue", [["moi", "Vous"], ["couple", "Couple"]], U.vueAvenir, v => { U.vueAvenir = v; tout(); }, "Valeur nette de qui");
    else { const c = document.getElementById("vn-vue"); c.textContent = ""; c.dataset.cle = ""; }
    const couple = U.vueAvenir === "couple", cle = couple ? "menage" : "moi";
    const p = R.projection, def = i => R.deflateur(i);
    const val = p.map((x, i) => x[cle] / def(i));
    const bas = p.map((x, i) => Math.min(...Object.keys(SCENARIOS).map(k => R.projections[k][i][cle])) / def(i));
    const haut = p.map((x, i) => Math.max(...Object.keys(SCENARIOS).map(k => R.projections[k][i][cle])) / def(i));
    const qui = couple ? "Valeur nette du couple" : "Votre valeur nette";
    const unite = S.scenarios.dollarsAujourdhui ? " (dollars d'aujourd'hui)" : "";
    const montrer = i => {
      const d = val[i] - val[0];
      hero("vn-hero", i === 0 ? `${qui} aujourd'hui` : `${qui} en ${p[i].annee}${unite}`, $(val[i]), [
        i === 0 ? puce(`${signe(val[10] - val[0])} d'ici ${p[10].annee}`, val[10] >= val[0] ? "haut" : "bas", val[10] >= val[0]) : puce(`${signe(d)} par rapport à aujourd'hui`, d >= 0 ? "haut" : "bas", d >= 0),
        i === 0 ? null : `Entre ${$(bas[i])} et ${$(haut[i])} selon le scénario`,
      ], i === 0 ? val[0] : undefined);
    };
    montrer(0);
    segment("vn-horizon", [["10", "10 ans"], ["20", "20 ans"], ["30", "30 ans"]], String(R.annees), v => changer("scenarios.horizon", +v), "Horizon de la projection");
    // En glissant sur le graphique, le chiffre principal suit l'année touchée.
    graphiqueLignes(document.getElementById("vn-graph"), document.getElementById("vn-legende"), [
      { nom: qui, couleur: SERIES[0], valeurs: val },
    ], p.map(x => String(x.annee)), {
      titre: "Valeur nette projetée", surPoint: i => montrer(i == null ? 0 : i),
      bande: { bas, haut, couleur: SERIES[0] },
      legende: [{ nom: `Scénario ${SCENARIOS[R.scenario].toLowerCase()}`, couleur: SERIES[0] }, { nom: "Du prudent à l'optimiste", couleur: SERIES[0], zone: true }],
    });
    const hypD = S.dettes.filter(d => d.type === "hypotheque");
    const surplusCopro = hypD.reduce((a, d) => a + Math.max(0, ((d.paiementMoi ?? 100) - (d.partMoi ?? 100)) / 100), 0);
    document.getElementById("vn-note").textContent = (R.locataire ? "Chaque paiement réduit vos dettes. Une fois les dettes remboursées, le même budget mensuel est placé. Glissez sur le graphique pour voir chaque année."
      : "Chaque paiement d'hypothèque réduit la dette : le capital remboursé devient de l'équité dans la maison, dont la valeur croît chaque année. Une fois les dettes remboursées, le même budget mensuel est placé. Glissez sur le graphique pour voir chaque année.") +
      (surplusCopro > 0 && !couple ? ` Vous payez une plus grande part de l'hypothèque que votre part de la maison : le capital que vous remboursez enrichit aussi ${cj ? votreP() : "l'autre copropriétaire"}, sauf entente écrite ou mariage.` : "");

    // De quoi elle est faite : aujourd'hui, dans 10 ans, dans 20 ans.
    const fin = p.length - 1, cols = [0, Math.round(fin / 2), fin];
    const v = (i, f) => f(p[i]) / def(i), autresActifs = (S.actifs.autres || []).length > 0;
    const L = (couple
      ? [["Maison, part du couple", x => x.maisonMenage], ["Hypothèques", x => -x.hypMenage], ["Équité dans la maison", x => x.equiteMenage, "sous-total"],
         ["Placements : REER, CELI, CELIAPP, comptes", x => x.placements + x.conjointe], ...(R.societeActive ? [["Placements dans la société", x => x.societe]] : []), ["Autos", x => x.voitureMenage],
         ...(autresActifs ? [["Autres actifs", x => x.autresActifsMenage]] : []), ["Autres dettes", x => -x.autresMenage]]
      : [["Maison, votre part", x => x.maisonMoi], ["Hypothèques, votre part", x => -x.hypMoi], ["Équité dans la maison", x => x.equiteMoi, "sous-total"],
         ["Placements : REER, CELI, CELIAPP, comptes", x => x.placements], ...(R.societeActive ? [["Placements dans la société", x => x.societe]] : []), ["Auto", x => x.voitureMoi],
         ...(autresActifs ? [["Autres actifs", x => x.autresActifsMoi]] : []), ["Autres dettes, votre part", x => -x.autresMoi]])
      .filter(([n]) => !R.locataire || !/Maison|Hypoth|Équité/.test(n) || S.dettes.some(d => d.type === "hypotheque"));
    // Sur téléphone, montants abrégés (k$, M$) pour que les trois colonnes tiennent.
    const tableComp = document.getElementById("vn-composition");
    const court = (tableComp.closest(".carte").clientWidth || 600) < 520;
    const m$ = x => !court ? $(x) : Math.abs(x) >= 1e6 ? nb(x / 1e6, 2) + " M$" : nb(x / 1000, Math.abs(x) >= 1e5 ? 0 : 1) + " k$";
    lignes(tableComp, ["", ...cols.map(i => i === 0 ? "Aujourd'hui" : String(p[i].annee))], [
      ...L.map(([n, f, cls]) => ({ cls: cls === "sous-total" ? "choix" : null, cellules: [n, ...cols.map(i => { const x = v(i, f); return Math.abs(x) < 0.5 ? "—" : m$(x); })] })),
      { cls: "total", cellules: ["Valeur nette", ...cols.map(i => m$(v(i, x => x[cle])))] },
    ]);
    document.getElementById("vn-composition-note").textContent = (R.locataire ? "Locataire : aucune maison dans la valeur nette ; le loyer fait partie du budget."
      : `Valeur de la maison : ${$(p[0].valeurMaison)} aujourd'hui, ${$(p[cols[cols.length - 1]].valeurMaison / def(cols[cols.length - 1]))} en ${p[cols[cols.length - 1]].annee} (${signePct(h.croissanceMaison)} par année).`) +
      (R.societeActive ? " Les placements de la société sont comptés avant l'impôt personnel au retrait ; leur rendement est réduit de moitié par l'impôt de la société sur le revenu de placement." : "") +
      (S.scenarios.dollarsAujourdhui ? " Montants en dollars d'aujourd'hui." : "");

    rangees("vn-scenarios", Object.entries(SCENARIOS).map(([k, nom]) => {
      const pk = R.projections[k], fin = pk[pk.length - 1], dix = pk[Math.min(10, pk.length - 1)];
      return { titre: nom, ico: k === R.scenario ? "ok" : " ", cls: k === R.scenario ? "choisi" : null,
        sous: R.libres[k] ? `Sans dettes en ${moisAn(R.libres[k])}` : "Dettes jamais remboursées",
        valeur: $(fin[cle] / def(pk.length - 1)), valeurSous: `${dix.annee} : ${$(dix[cle] / def(10))}`,
        action: k === R.scenario ? null : () => changer("scenarios.choisi", k) };
    }));

    rendreBilan(R, couple); rendreReel(R, couple); rendreObjectifs(R); rendreProchain(R);
    rendreIndependance(R, couple); rendreFrais(R); rendrePlans(R); rendreDossier(R); rendreChances(R, couple);
    rangees("ep-reee", [
      ...R.reee.map((x, i) => {
        const e = S.epargne.reee.enfants[i];
        return { titre: e.nom, sous: `${nb(e.age, 0)} ans · encore ${x.ans} an${x.ans > 1 ? "s" : ""} de cotisations`, valeur: $(x.solde), valeurSous: `dont ${$(x.subventions)} de subventions`, action: () => feuilleEnfant(i) };
      }),
      { titre: "Ajouter un enfant", ico: "plus", cls: "ajout", action: () => { S.epargne.reee.enfants.push({ id: nouvelId("e"), nom: "Enfant", age: 0, solde: 0 }); sauver(); tout(); feuilleEnfant(S.epargne.reee.enfants.length - 1); } },
    ]);
    const z = document.getElementById("ep-reer"); z.textContent = "";
    const c = S.epargne.reer.cotisationAnnuelle;
    z.appendChild(el("p", "resume", c > 0
      ? `Cotiser ${$(c)} au REER vous rembourse environ ${$(R.remboursementReer)} d'impôt (${pct(R.remboursementReer / c, 0)}).${S.strategie.reerSurDettes ? " Ce remboursement est versé sur vos dettes chaque avril." : ""}`
      : `Aucune cotisation REER prévue. 10 000 $ cotisés rapporteraient environ ${$(R.impotSansReer - R.impotAvecReer(10000))} de remboursement.`));
    // Remboursement selon la cotisation : votre taux marginal baisse à mesure que le revenu imposable diminue.
    const droits = S.epargne.reer.droits, montants = [5000, 10000, 20000, 30000].filter(m => !droits || m < droits);
    if (droits > 0) montants.push(droits);
    if (montants.length) {
      z.appendChild(el("h3", null, "Remboursement selon la cotisation"));
      z.appendChild(rangees(el("div"), montants.map(m => {
        const rb = R.impotSansReer - R.impotAvecReer(m);
        return { titre: `Cotiser ${$(m)}`, sous: m === droits ? "Tous vos droits inutilisés" : `Coût réel : ${$(m - rb)}`, valeur: $(rb), valeurSous: `${pct(rb / m, 0)} remboursé` };
      })));
    }
    z.appendChild(rangees(el("div"), [
      { titre: "Solde REER", valeur: $(S.epargne.reer.solde) },
      { titre: "Droits inutilisés", sous: "Sur votre avis de cotisation fédéral", valeur: $(S.epargne.reer.droits) },
      { titre: "Solde CELI", valeur: $(S.epargne.celi.solde) },
    ]));
  }

  function rendreFiabilite() {
    const uniques = [...new Set(Object.values(CHAMPS).flat().filter(c => c.p).map(c => c.p))];
    const n = uniques.filter(p => S.confirmes[p]).length;
    document.getElementById("fiabilite").textContent = `${n} sur ${uniques.length}`;
    document.querySelector("#fiabilite-jauge span").style.width = (n / Math.max(1, uniques.length) * 100) + "%";
    const l = document.getElementById("liste-a-confirmer"); l.textContent = "";
    Object.values(CHAMPS).flat().filter(c => c.p && !S.confirmes[c.p]).filter((c, i, a) => a.findIndex(x => x.p === c.p) === i).forEach(c => l.appendChild(el("li", null, texteDe(c.l))));
    document.getElementById("donnees-maj").textContent = S.meta.misAJour ? `Dernière modification : ${new Date(S.meta.misAJour).toLocaleString("fr-CA")}` : "";
  }

  let R = null;
  function tout() {
    R = calculer();
    rendreApercu(R); rendreRevenu(R); rendreImpot(R); rendreBudget(R); rendreAvenir(R); rendreFiabilite();
    if (feuilleCourante && feuilleCourante.maj) feuilleCourante.maj();
  }

  /* ============================================================
     RESTE À DÉPENSER LIBREMENT : le revenu net, moins les dépenses fixes, les
     dépenses annuelles (par mois), les dettes et l'épargne. Votre part.
     ============================================================ */
  const FIXES = new Set(["loyer", "taxesMunicipales", "taxesScolaires", "assuranceHabitation", "electricite", "chauffage", "eau", "deneigement", "alarme", "condo", "entreposage",
    "assuranceAuto", "immatriculation", "stationnement", "locationAuto", "caa", "garderie", "ecole", "ecolePrivee", "argentPoche", "assuranceMedicaments", "orthodontie", "assuranceSante",
    "assuranceInvalidite", "assuranceVie", "maladiesGraves", "assuranceVoyage", "cellulaires", "internet", "television", "abonnements", "telephoneFixe", "infonuagique", "sport", "clubs",
    "fraisBancaires", "comptable", "pensionAlimentaire", "fraisPlacements", "aideFamille"]);
  const CATS_FIXES = new Set(["Logement", "Assurances personnelles", "Télécom et abonnements", "Finances"]);
  const estFixe = b => b.k ? FIXES.has(b.k) : CATS_FIXES.has(b.cat);
  function resteADepenser(R) {
    const part = S.menage.partCommunMoi / 100, qui = b => b.qui === "moi" ? 1 : b.qui === "commun" ? part : 0;
    let fixes = 0, annuelles = 0, variables = 0;
    for (const b of depensesEffectives()) { const m = mensuel(b) * qui(b); if (b.periode === "an") annuelles += m; else if (estFixe(b)) fixes += m; else variables += m; }
    return { fixes, annuelles, variables, libre: R.netMoi - fixes - annuelles - R.dettesMoi - R.epargneMoi };
  }
  function rendreReste(R) {
    const z = document.getElementById("bu-reste"); z.textContent = "";
    const x = resteADepenser(R);
    rangees(z.appendChild(el("div")), [
      { titre: "Revenu net", valeur: $(R.netMoi) },
      { titre: "Dépenses fixes", sous: "Loyer, assurances, abonnements, garderie…", valeur: moins(x.fixes) },
      x.annuelles > 0 && { titre: "Dépenses annuelles, par mois", sous: "À mettre de côté", valeur: moins(x.annuelles) },
      R.dettesMoi > 0 && { titre: "Paiements de dettes", sous: "Minimums", valeur: moins(R.dettesMoi) },
      R.epargneMoi > 0 && { titre: "Épargne et objectifs", valeur: moins(R.epargneMoi) },
      { titre: "Reste à dépenser librement", cls: "total", valeur: $(x.libre) },
    ]);
    z.appendChild(el("p", "aide" + (x.libre < 0 ? " avertissement" : ""), x.libre < 0
      ? "Vos dépenses fixes, vos dettes et votre épargne dépassent votre revenu net : revoyez-les avant tout."
      : `Vous y avez prévu ${$(x.variables)} de dépenses variables (épicerie, essence, sorties…). Ce que vous ne dépensez pas va aux dettes, puis au placement : c'est votre surplus de ${$(Math.max(0, R.surplusMoi))}.`));
  }

  /* ============================================================
     BILAN DU MOIS : ce qui a été reçu et dépensé, comparé au budget.
     ============================================================ */
  const moisCle = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const moisPasse = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return moisCle(d); };
  const nomMois = cle => { const d = dateMois(cle); return d ? d.toLocaleDateString("fr-CA", { month: "long", year: "numeric" }) : cle; };
  function feuilleBilan(cle) {
    S.bilans = S.bilans || [];
    let i = S.bilans.findIndex(b => b.mois === cle);
    if (i < 0) { S.bilans.push({ id: nouvelId("m"), mois: cle, recu: null, depense: null, note: "" }); S.bilans.sort((a, b) => a.mois < b.mois ? -1 : 1); i = S.bilans.findIndex(b => b.mois === cle); sauver(); }
    const b = S.bilans[i], nom = nomMois(cle);
    ouvrirFeuille(`Bilan de ${nom}`, c => {
      c.appendChild(el("p", "aide feuille-intro", "D'après votre relevé bancaire : le revenu net reçu (paiements de la RAMQ après l'impôt mis de côté, salaire) et les dépenses du mois, sans les paiements de dettes ni l'épargne."));
      const champ = (k, l, prevu) => { const ligne = creerChamp({ l, u: "$", s: 10, h: `Prévu au budget : ${$(prevu)}` }, `bm-${b.id}-${k}`, lierListe("bilans", i, k), false);
        const inp = ligne.querySelector("input"); inp.value = b[k] ?? ""; inp.placeholder = String(Math.round(prevu)); c.appendChild(ligne); };
      champ("recu", "Revenu net reçu", R.netMoi);
      champ("depense", "Dépenses du mois", R.depMoi);
      const l = el("div", "champ large"), lab = el("label", null, "Note"), boite = el("div", "saisie"), inp = el("input"); lab.htmlFor = `bm-${b.id}-note`;
      inp.type = "text"; inp.id = `bm-${b.id}-note`; inp.value = b.note || ""; inp.placeholder = "Vacances, réparation de l'auto…"; lierListe("bilans", i, "note")(inp);
      boite.appendChild(inp); l.append(lab, boite, el("span")); c.appendChild(l);
      const ac = el("div", "feuille-actions"), x = el("button", "bouton danger large", "Retirer ce bilan"); x.type = "button"; x.dataset.suppr = "bilans"; x.dataset.i = i; ac.appendChild(x); c.appendChild(ac);
    });
  }
  function rendreBilanMois(R) {
    const z = document.getElementById("bu-bilan"); z.textContent = "";
    const l = (S.bilans || []).filter(b => b.recu != null || b.depense != null).slice(-6).reverse(), passe = moisPasse();
    if (!l.length) z.appendChild(el("p", "aide", "Une fois par mois, deux minutes : ce que vous avez reçu et dépensé, d'après votre relevé. Vous verrez si votre budget tient la route."));
    else {
      const d = l[0], ecart = (d.depense ?? 0) - R.depMoi;
      const res = el("p", "resume");
      res.append(document.createTextNode(`En ${nomMois(d.mois)}, vous avez dépensé `), el("strong", null, $(d.depense ?? 0)),
        document.createTextNode(`, soit ${$(Math.abs(ecart))} ${ecart > 0 ? "de plus" : "de moins"} que prévu. Reçu : ${$(d.recu ?? 0)} (prévu ${$(R.netMoi)}).`));
      z.appendChild(res);
      z.appendChild(rangees(el("div"), l.map(b => { const e = (b.depense ?? 0) - R.depMoi;
        return { titre: nomMois(b.mois)[0].toUpperCase() + nomMois(b.mois).slice(1), sous: `Reçu ${$(b.recu ?? 0)}${b.note ? ` · ${b.note}` : ""}`, valeur: $(b.depense ?? 0),
          valeurSous: `${signe(e)} sur le budget`, action: () => feuilleBilan(b.mois) }; })));
    }
    const a = el("div", "actions"), bt = el("button", "bouton secondaire", (S.bilans || []).some(b => b.mois === passe && (b.recu != null || b.depense != null)) ? `Revoir le bilan de ${nomMois(passe)}` : `Faire le bilan de ${nomMois(passe)}`);
    bt.type = "button"; bt.addEventListener("click", () => feuilleBilan(passe)); a.appendChild(bt); z.appendChild(a);
  }

  /* ============================================================
     EXPORT EN TABLEUR (CSV) : résumé, budget, dettes, projection.
     ============================================================ */
  function exporterTableur() {
    const Rr = R, part = S.menage.partCommunMoi / 100, qui = b => b.qui === "moi" ? 1 : b.qui === "commun" ? part : 0;
    const n = v => (Math.round((+v || 0) * 100) / 100).toFixed(2).replace(".", ",");
    const t = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const L = [];
    const ligne = (...c) => L.push(c.join(";"));
    ligne(t("WealthMorand"), t(`Exporté le ${new Date().toLocaleDateString("fr-CA")}`)); L.push("");
    ligne(t("Résumé"), t("Montant"));
    [["Revenu brut de l'année", Rr.brut], ["Net après impôt (année)", Rr.nets[Rr.mode]], ["Impôt et cotisations (année)", Rr.impot.total], ["Revenu net par mois", Rr.netMoi],
     ["Dépenses par mois (votre part)", Rr.depMoi], ["Paiements de dettes par mois", Rr.dettesMoi], ["Épargne par mois", Rr.epargneMoi], ["Surplus par mois", Rr.surplusMoi],
     ["Dettes totales", Rr.detteTotale], ["Valeur nette aujourd'hui", Rr.projection[0].moi]].forEach(([a, v]) => ligne(t(a), n(v)));
    L.push(""); ligne(t("Budget"), t("Catégorie"), t("Dépense"), t("Montant"), t("Période"), t("Qui paie"), t("Par mois, votre part"));
    depensesEffectives().filter(b => b.montant > 0).forEach(b => ligne(t(""), t(categorie(b)), t(b.k ? nomDepense(b) : b.nom), n(b.montant), t(b.periode === "an" ? "par année" : "par mois"),
      t({ moi: "Moi", commun: "Partagée", conjoint: "Partenaire" }[b.qui] || b.qui), n(mensuel(b) * qui(b))));
    L.push(""); ligne(t("Dettes"), t("Nom"), t("Type"), t("Solde"), t("Taux (%)"), t("Paiement minimum par mois"), t("Remboursée en"));
    S.dettes.forEach((d, i) => { const f = Rr.sim.dettes[i] && Rr.sim.dettes[i].fin; ligne(t(""), t(d.nom), t(d.type), n(d.solde), n(d.taux), n(minimumDette(d)), t(f ? moisAn(f) : "")); });
    L.push(""); ligne(t("Projection"), t("Année"), t("Valeur nette"), t("Placements"), t("Maison, votre part"), t("Hypothèques, votre part"), t("Autres dettes, votre part"));
    Rr.projection.forEach(x => ligne(t(""), t(x.annee), n(x.moi), n(x.placements), n(x.maisonMoi), n(x.hypMoi), n(x.autresMoi)));
    const blob = new Blob(["﻿" + L.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `wealthmorand-tableur-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Tableur exporté : ouvrez-le dans Excel, Numbers ou Google Sheets.");
  }

  /* ============================================================
     PROBABILITÉ DE RÉUSSITE : des centaines d'avenirs possibles, avec des
     rendements qui varient chaque année autour de celui du scénario.
     ============================================================ */
  function rendreChances(R, couple) {
    const z = document.getElementById("pa-chances"); z.textContent = "";
    if (document.getElementById("v-avenir").hidden) return;   // calcul fait quand la page est ouverte
    const vol = S.scenarios.volatilite ?? 10, M = R.monteCarlo(300, vol), p = R.projection, fin = p.length - 1, cle = couple ? "menage" : "moi";
    const def = i => R.deflateur(i), q = (k, i) => M.quantile(cle, i, k) / def(i);
    const res = el("p", "resume");
    res.append(document.createTextNode(`Dans 8 cas sur 10, ${couple ? "la valeur nette du couple" : "votre valeur nette"} en ${p[fin].annee} se situerait entre `),
      el("strong", null, `${$(q(0.1, fin))} et ${$(q(0.9, fin))}`), document.createTextNode(` ; la moitié des cas au-dessus de ${$(q(0.5, fin))}.`));
    z.appendChild(res);
    const leg = el("div", "legende"), g = el("div", "graphique"); z.append(leg, g);
    graphiqueLignes(g, leg, [{ nom: "Médiane", couleur: SERIES[0], valeurs: p.map((x, i) => q(0.5, i)) }], p.map(x => String(x.annee)), {
      titre: "Valeur nette : 8 cas sur 10", hauteur: 190, bande: { bas: p.map((x, i) => q(0.1, i)), haut: p.map((x, i) => q(0.9, i)), couleur: SERIES[0] },
      legende: [{ nom: "Médiane", couleur: SERIES[0] }, { nom: "8 cas sur 10", couleur: SERIES[0], zone: true }],
    });
    const F = independance(R, couple), annees = F.annee ? [F.annee - 3, F.annee, F.annee + 3].filter(a => a > p[0].annee && a <= p[fin].annee) : [p[fin].annee];
    z.appendChild(el("h3", "sous-titre", "Chances d'atteindre l'indépendance financière"));
    z.appendChild(rangees(el("div"), annees.map(a => ({ titre: `D'ici ${a}${F.naissance ? ` (à ${a - F.naissance} ans)` : ""}`, valeur: pct(M.chancesIndependance(a, couple), 0) }))));
    z.appendChild(el("p", "aide", `300 simulations : chaque année, le rendement des placements varie autour de ${nb(R.hyp.rendement, 1)} % (scénario ${SCENARIOS[R.scenario].toLowerCase()}), avec un écart type de ${nb(vol)} %, comme un portefeuille ${vol >= 14 ? "surtout en actions" : vol <= 7 ? "prudent" : "équilibré"}. La maison, les dettes et le revenu suivent le scénario. Le passé ne garantit pas l'avenir.`));
  }

  /* ============================================================
     FLUX DE L'ANNÉE (diagramme de Sankey) : des revenus aux impôts et frais,
     puis du revenu disponible aux dépenses, aux dettes, à l'épargne et au surplus.
     Votre part, par année.
     ============================================================ */
  function fluxAnnee(R) {
    const g = R.rev, soc = R.societeActive, x = R.impot.societe, part = S.menage.partCommunMoi / 100;
    const act = (g.activites || 0) + (g.polyvalence || 0), autresPro = R.autresPro + (S.revenu.autresRevenus || 0), deficit = Math.max(0, -R.surplusMoi * 12);
    const sources = [
      ["Pratique principale", R.brut - act - autresPro], ["Activités en établissement", act], ["Autres revenus professionnels", autresPro],
      ["Location et placements", R.autresNonPro], ["Allocations familiales", R.allocMoi * 12], ["Manque à combler", deficit],
    ].filter(([, v]) => v > 0.5);
    const T = sources.reduce((t, [, v]) => t + v, 0), net = R.netMoi * 12 + deficit;
    const sorties = soc
      ? [["Dépenses de la société", x.depenses + x.frais, SERIES[5]], ["Laissé dans la société", x.retenu, SERIES[3]]]
      : [[g[R.mode].fraisCabinet ? "Frais et dépenses pro" : "Dépenses pro", R.dproPerso, SERIES[5]]];
    const impot = T - net - sorties.reduce((t, [, v]) => t + v, 0);
    const milieu = [["Impôt et cotisations", impot, SERIES[4]], ...sorties, [deficit ? "Disponible" : "Revenu disponible", net, "var(--marque)"]].filter(([, v]) => v > 0.5);
    // Dépenses par catégorie (votre part), les quatre plus grandes, puis le reste.
    const qui = b => b.qui === "moi" ? 1 : b.qui === "commun" ? part : 0, parCat = new Map();
    for (const b of depensesEffectives()) parCat.set(categorie(b), (parCat.get(categorie(b)) || 0) + mensuel(b) * qui(b) * 12);
    const cats = [...parCat].filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]);
    const grandes = cats.slice(0, 4), reste = cats.slice(4).reduce((t, [, v]) => t + v, 0);
    const fin = [...grandes.map(([n, v]) => [n, v, SERIES[0]]), ["Autres dépenses", reste, SERIES[0]],
      ["Paiements de dettes", R.dettesMoi * 12, SERIES[1]], ["Épargne", R.epargneMoi * 12, SERIES[2]], ["Surplus", Math.max(0, R.surplusMoi * 12), SERIES[3]]].filter(([, v]) => v > 0.5);
    return { sources, T, milieu, net, fin };
  }
  function rendreFlux(R) {
    const boite = document.getElementById("bu-flux"); if (!boite) return;
    const F = fluxAnnee(R);
    if (F.T <= 0) { boite.textContent = ""; return; }
    const W = Math.max(300, boite.clientWidth || 600), H = W < 520 ? 360 : 330, nw = 12, gap = 10;
    const x1 = 0, x2 = Math.round(W * (W < 520 ? 0.4 : 0.42)), x3 = W - nw;
    const nM = F.milieu.length, nF = F.fin.length;
    const k = Math.min((H - (nM - 1) * gap) / F.T, (H - (nF - 1) * gap) / Math.max(1, F.net));
    // Colonne du milieu, du haut vers le bas ; la dernière (revenu disponible) alimente la colonne de droite.
    let y = 0; const M = F.milieu.map(([n, v, c]) => { const o = { n, v, c, y, h: v * k }; y += o.h + gap; return o; });
    const dispo = M[M.length - 1];
    const hF = F.fin.reduce((t, [, v]) => t + v * k, 0) + (nF - 1) * gap;
    let yf = Math.max(0, Math.min(H - hF, dispo.y + dispo.h / 2 - hF / 2));
    const D = F.fin.map(([n, v, c]) => { const o = { n, v, c, y: yf, h: v * k }; yf += o.h + gap; return o; });
    const yTot = (nM - 1) * gap / 2;   // la colonne de gauche, centrée sur celle du milieu
    const bande = (xa, ya, xb, yb, h, c) => { const xm = (xa + xb) / 2;
      return `<path class="flux-bande" d="M${xa},${ya}C${xm},${ya} ${xm},${yb} ${xb},${yb}L${xb},${yb + h}C${xm},${yb + h} ${xm},${ya + h} ${xa},${ya + h}Z" style="fill:${c}"/>`; };
    const k$c = v => Math.abs(v) >= 1e6 ? nb(v / 1e6, 2) + " M$" : Math.abs(v) >= 1e4 ? nb(v / 1000, 0) + " k$" : $(v);
    const etiquette = (xe, o, ancre) => {
      const cy = o.y + o.h / 2, deux = o.h >= 26;
      return `<text class="flux-etiquette" x="${xe}" y="${cy}" text-anchor="${ancre}" dy="${deux ? "-0.25em" : "0.35em"}">${o.n}${deux ? "" : ` · ${k$c(o.v)}`}</text>` +
        (deux ? `<text class="flux-montant" x="${xe}" y="${cy}" text-anchor="${ancre}" dy="1.05em">${k$c(o.v)}</text>` : "");
    };
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Flux de l'année : ${[...F.milieu, ...F.fin].map(([n, v]) => `${n} ${$(v)}`).join(", ")}">`;
    let yo = yTot;
    for (const o of M) { s += bande(x1 + nw, yo, x2, o.y, o.h, o.c); yo += o.h; }
    yo = dispo.y;
    for (const o of D) { s += bande(x2 + nw, yo, x3, o.y, o.h, o.c); yo += o.h; }
    s += `<rect class="flux-noeud" x="${x1}" y="${yTot}" width="${nw}" height="${F.T * k}" rx="3" style="fill:var(--encre-2)"/>`;
    for (const o of [...M, ...D]) s += `<rect class="flux-noeud" x="${o === dispo || M.includes(o) ? x2 : x3}" y="${o.y}" width="${nw}" height="${Math.max(1.5, o.h)}" rx="3" style="fill:${o.c}"/>`;
    for (const o of M) s += etiquette(x2 - 6, o, "end");
    for (const o of D) s += etiquette(x3 - 6, o, "end");
    s += "</svg>";
    boite.innerHTML = s;
    const src = document.getElementById("bu-flux-sources");
    src.textContent = `Revenus de l'année : ${$(F.T)}${F.sources.length > 1 ? ` (${F.sources.map(([n, v]) => `${n.toLowerCase()} ${k$c(v)}`).join(", ")})` : ""}.`;
  }

  /* ============================================================
     COMPARER DEUX PLANS : une copie de votre plan (plan B) qu'on modifie dans
     toute l'app, puis qu'on compare à votre plan ; on peut l'adopter.
     ============================================================ */
  const racine = () => principal || S;
  function copiePlan(s) {
    const d = clone(s); delete d.plans;
    d.suivi = { reference: null, instantanes: [] };
    return d;
  }
  // Résultats d'un autre état (votre plan ou un plan B), sans toucher à l'affichage.
  function calculerAvec(donnees) { const sauf = S; S = donnees; try { return calculer(); } finally { S = sauf; } }
  function entrerPlan(i) {
    if (planActif !== null) sortirPlan(true);
    principal = S; planActif = i; S = principal.plans[i].donnees;
    majBandeauPlan(); tout();
    toast(`Vous modifiez « ${principal.plans[i].nom} ». Votre plan n'est pas touché.`);
  }
  function sortirPlan(silence) {
    if (planActif === null) return;
    S = principal; principal = null; planActif = null;
    if (feuille.open) feuille.close();
    majBandeauPlan();
    if (!silence) { tout(); toast("De retour à votre plan."); }
  }
  function majBandeauPlan() {
    const b = document.getElementById("bandeau-plan");
    b.hidden = planActif === null;
    if (planActif !== null) document.getElementById("bandeau-plan-nom").textContent = principal.plans[planActif].nom;
    document.documentElement.classList.toggle("mode-plan", planActif !== null);
  }
  function creerPlan() {
    const r = racine(); r.plans = r.plans || [];
    r.plans.push({ id: nouvelId("p"), nom: r.plans.length ? `Plan ${String.fromCharCode(66 + r.plans.length)}` : "Plan B", donnees: copiePlan(r) });
    sauver();
    entrerPlan(r.plans.length - 1);
  }
  function feuillePlan(i) {
    ouvrirFeuille("Nom du plan", c => {
      champsElement(c, "plans", i, [{ k: "nom", l: "Nom", t: "text", ph: "Plan B, Société en 2027…" }]);
    });
  }
  function adopterPlan(i) {
    const r = racine(), plan = r.plans[i], ancien = copiePlan(r);
    const nouveau = { ...clone(plan.donnees), meta: { ...r.meta, exemple: false }, suivi: r.suivi,
      plans: r.plans.filter((_, j) => j !== i).concat({ id: nouvelId("p"), nom: "Ancien plan", donnees: ancien }) };
    sortirPlan(true);
    const avant = S; S = normaliser(nouveau); sauver(); tout();
    toast(`« ${plan.nom} » est maintenant votre plan ; l'ancien est gardé comme plan de comparaison.`, () => { S = avant; sauver(); tout(); });
  }
  // Ce qui change d'un plan à l'autre, en mots.
  const DEF_CHAMPS = new Map(Object.values(CHAMPS).flat().filter(c => c.p).map(c => [c.p, c]));
  const SECTIONS_PLAN = { budget: "le budget", budgetTotaux: "le budget", dettes: "les dettes", objectifs: "les objectifs", "revenu.activites": "les activités en établissement",
    "revenu.lignes": "les autres revenus", "revenu.tarifs": "les tarifs", "impot.depensesProDetail": "les dépenses professionnelles", "epargne.reee": "le REEE", "actifs.autres": "les autres actifs", conjointe: "le ou la partenaire" };
  function differences(a, b, chemin = "", out = []) {
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
        if (!["meta", "suivi", "plans", "confirmes", "dossier"].includes(k)) differences(a[k], b[k], chemin ? `${chemin}.${k}` : k, out);
    } else if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) out.push([chemin, a, b]);
    return out;
  }
  function changementsPlan(a, b) {
    const valeurTexte = (c, v) => c.t === "select" ? texteDe((c.o.find(([k]) => String(k) === String(v)) || [null, v])[1]) : c.t === "check" ? (v ? "oui" : "non") : typeof v === "number" ? nb(v) : String(v ?? "—");
    const champs = [], autres = new Set();
    for (const [p, va, vb] of differences(a, b)) {
      const c = DEF_CHAMPS.get(p);
      if (c) champs.push(`${texteDe(c.l)} : ${valeurTexte(c, va)} → ${valeurTexte(c, vb)}`);
      else { const s = Object.keys(SECTIONS_PLAN).find(k => p === k || p.startsWith(k + ".")); if (s) autres.add(SECTIONS_PLAN[s]); }
    }
    return { champs, autres: [...autres] };
  }
  function rendrePlans(R) {
    const z = document.getElementById("pa-plans"); if (!z) return; z.textContent = "";
    const r = racine(), plans = r.plans || [];
    const bouton = (texte, cls, f) => { const b = el("button", "bouton " + cls, texte); b.type = "button"; b.addEventListener("click", f); return b; };
    if (!plans.length) {
      z.appendChild(el("p", "aide", "Copiez votre plan, changez quelques choix (vous incorporer, acheter une maison en 2028, passer à 4 jours, une autre méthode de remboursement), puis comparez les deux valeurs nettes."));
      const a = el("div", "actions"); a.appendChild(bouton("Créer un plan B", "", creerPlan)); z.appendChild(a); return;
    }
    if (document.getElementById("v-avenir").hidden) return;   // calcul fait quand la page est ouverte
    const i = planActif ?? 0, plan = plans[i];
    const Rp = planActif === null ? R : calculerAvec(principal), Rb = planActif === null ? calculerAvec(plan.donnees) : R;
    const n = Math.min(Rp.projection.length, Rb.projection.length);
    const leg = el("div", "legende"), g = el("div", "graphique"); z.append(leg, g);
    graphiqueLignes(g, leg, [
      { nom: "Votre plan", couleur: SERIES[0], valeurs: Rp.projection.slice(0, n).map(x => x.moi) },
      { nom: plan.nom, couleur: SERIES[3], valeurs: Rb.projection.slice(0, n).map(x => x.moi) },
    ], Rp.projection.slice(0, n).map(x => String(x.annee)), { titre: "Valeur nette : votre plan et " + plan.nom, hauteur: 200 });
    const dix = Math.min(10, n - 1), fin = n - 1;
    const t = el("table", "tableau"); const td = el("div", "tableau-defile"); td.appendChild(t); z.appendChild(td);
    // Sur téléphone, montants abrégés (k$, M$) pour que les quatre colonnes tiennent.
    const court = (z.clientWidth || 600) < 520, m$ = v => !court ? $(v) : Math.abs(v) >= 1e6 ? nb(v / 1e6, 2) + " M$" : Math.abs(v) >= 1e4 ? nb(v / 1000, 0) + " k$" : $(v);
    const ecart = (a, b) => { const d = b - a; return Math.abs(d) < 0.5 ? "=" : (d > 0 ? "+" : "−") + m$(Math.abs(d)); };
    const libre = r => r.sim.libre ? (court ? r.sim.libre.toLocaleDateString("fr-CA", { month: "short", year: "numeric" }) : moisAn(r.sim.libre)) : "jamais";
    lignes(t, ["", "Votre plan", plan.nom, "Écart"], [
      { cellules: ["Net par mois", m$(Rp.netMoi), m$(Rb.netMoi), ecart(Rp.netMoi, Rb.netMoi)] },
      { cellules: ["Surplus par mois", m$(Rp.surplusMoi), m$(Rb.surplusMoi), ecart(Rp.surplusMoi, Rb.surplusMoi)] },
      { cellules: ["Sans dettes", libre(Rp), libre(Rb), ""] },
      { cellules: [`Valeur nette ${Rp.projection[dix].annee}`, m$(Rp.projection[dix].moi), m$(Rb.projection[dix].moi), ecart(Rp.projection[dix].moi, Rb.projection[dix].moi)] },
      { cls: "total", cellules: [`Valeur nette ${Rp.projection[fin].annee}`, m$(Rp.projection[fin].moi), m$(Rb.projection[fin].moi), ecart(Rp.projection[fin].moi, Rb.projection[fin].moi)] },
    ]);
    const ch = changementsPlan(planActif === null ? r : principal, plan.donnees);
    const liste = el("ul", "plan-changements");
    if (!ch.champs.length && !ch.autres.length) liste.appendChild(el("li", null, `Aucun changement pour l'instant : touchez « Modifier ${plan.nom} », puis changez ce que vous voulez dans les pages.`));
    ch.champs.slice(0, 6).forEach(x => liste.appendChild(el("li", null, x)));
    if (ch.champs.length > 6) liste.appendChild(el("li", null, `Et ${ch.champs.length - 6} autre${ch.champs.length > 7 ? "s" : ""} réglage${ch.champs.length > 7 ? "s" : ""}.`));
    if (ch.autres.length) liste.appendChild(el("li", null, `Modifié aussi : ${ch.autres.join(", ")}.`));
    z.append(el("h3", "sous-titre", `Ce qui change dans ${plan.nom}`), liste);
    const a = el("div", "actions");
    if (planActif === null) a.append(bouton(`Modifier ${plan.nom}`, "", () => entrerPlan(i)), bouton("Adopter ce plan", "secondaire", () => adopterPlan(i)),
      bouton("Renommer", "secondaire", () => feuillePlan(i)));
    else a.append(bouton("Revenir à mon plan", "", () => sortirPlan()));
    if (planActif === null) { const x = el("button", "bouton danger", "Supprimer"); x.type = "button"; x.dataset.suppr = "plans"; x.dataset.i = i; a.appendChild(x); }
    z.appendChild(a);
  }

  /* ============================================================
     INDÉPENDANCE FINANCIÈRE ET JALONS PERSONNELS
     ============================================================ */
  // Indépendance : placements (REER, CELI, CELIAPP, comptes, société) égaux à N fois les dépenses
  // de l'année (25 fois : la règle du 4 %), en dollars de chaque année.
  function independance(R, couple, p = R.projection) {
    const I = S.independance || {}, mult = +I.multiple || 25, h = R.hyp;
    const depenses = (+I.depenses || 0) > 0 ? +I.depenses : (couple ? R.depMenage : R.depMoi) * 12;
    const placements = x => x.placements + x.societe + (couple ? x.conjointe : 0);
    const cible = a => mult * depenses * Math.pow(1 + h.inflation / 100, a);
    const i = p.findIndex((x, a) => placements(x) >= cible(a));
    const naissance = +I.anneeNaissance || 0;
    return { mult, depenses, cible0: cible(0), placements0: placements(p[0]), progression: Math.min(1, placements(p[0]) / Math.max(1, cible(0))),
      annee: i >= 0 ? p[i].annee : null, age: i >= 0 && naissance ? p[i].annee - naissance : null, fin: p[p.length - 1].annee, naissance };
  }
  const CHAMPS_INDEPENDANCE = [
    { p: "independance.multiple", l: "Placements visés, en années de dépenses", u: "fois", s: 1, h: "25 fois les dépenses de l'année : on peut en retirer environ 4 % par année (règle du 4 %). 30 fois pour plus de prudence." },
    { p: "independance.depenses", l: "Dépenses visées par année", u: "$/an", s: 1000, h: "0 : votre budget actuel, sans les paiements de dettes. En dollars d'aujourd'hui." },
    { p: "independance.anneeNaissance", l: "Votre année de naissance", u: "", s: 1, h: "Facultatif : pour afficher votre âge à chaque jalon." },
  ];
  const CHAMPS_JALON = [
    { k: "nom", l: "Jalon", t: "text", ph: "Chalet, passer à 3 jours, sabbatique…" },
    { k: "annee", l: "Année", u: "", s: 1 },
  ];
  function feuilleIndependance() {
    ouvrirFeuille("Indépendance financière", c => construireChamps(c, CHAMPS_INDEPENDANCE));
  }
  function feuilleJalon(i) {
    ouvrirFeuille(S.jalonsPerso[i].nom || "Jalon", c => { champsElement(c, "jalonsPerso", i, CHAMPS_JALON); boutonRetirer(c, "jalonsPerso", i, "Retirer ce jalon"); });
  }
  function ajouterJalon() {
    S.jalonsPerso = S.jalonsPerso || [];
    S.jalonsPerso.push({ id: nouvelId("j"), nom: "", annee: new Date().getFullYear() + 5 });
    S.meta.exemple = false; sauver(); tout(); feuilleJalon(S.jalonsPerso.length - 1);
  }
  function rendreIndependance(R, couple) {
    const z = document.getElementById("pa-independance"); z.textContent = "";
    const F = independance(R, couple), age = a => F.naissance ? ` (à ${a - F.naissance} ans)` : "";
    const res = el("p", "resume");
    res.append(document.createTextNode(F.annee ? "Indépendance financière vers " : "Pas d'indépendance financière avant "), el("strong", null, F.annee ? `${F.annee}${age(F.annee)}` : String(F.fin)),
      document.createTextNode(F.annee ? ` : vos placements atteindraient ${nb(F.mult)} fois vos dépenses de l'année, assez pour vivre de leurs rendements (scénario ${SCENARIOS[R.scenario].toLowerCase()}).` : ` au rythme actuel (scénario ${SCENARIOS[R.scenario].toLowerCase()}).`));
    z.appendChild(res);
    const j = el("div", "jauge"), sp = el("span"); sp.style.width = `${Math.round(F.progression * 100)}%`; j.appendChild(sp); z.appendChild(j);
    z.appendChild(rangees(el("div"), [
      { titre: "Cible aujourd'hui", sous: `${nb(F.mult)} fois ${$(F.depenses)} de dépenses par année`, valeur: $(F.cible0), action: feuilleIndependance },
      { titre: "Vos placements aujourd'hui", sous: "REER, CELI, CELIAPP, comptes" + (R.societeActive ? ", société" : ""), valeur: $(F.placements0), valeurSous: `${pct(F.progression, 0)} de la cible` },
    ]));
    z.appendChild(el("h3", "sous-titre", "Vos jalons personnels"));
    const p = R.projection, cle = couple ? "menage" : "moi";
    z.appendChild(rangees(el("div"), [
      ...(S.jalonsPerso || []).map((x, i) => { const k = Math.max(0, Math.min(p.length - 1, (+x.annee || 0) - p[0].annee));
        return { titre: x.nom || "Jalon sans nom", sous: `En ${x.annee}${age(+x.annee)}`, valeur: $(p[k][cle] / R.deflateur(k)), valeurSous: "valeur nette projetée", action: () => feuilleJalon(i) }; }),
      { titre: "Ajouter un jalon", sous: "Chalet, passer à 3 jours, sabbatique, retraite…", ico: "plus", cls: "ajout", action: ajouterJalon },
    ]));
  }

  /* ============================================================
     FRAIS DE GESTION DES PLACEMENTS : ce qu'ils coûtent sur l'horizon.
     ============================================================ */
  function rendreFrais(R) {
    const z = document.getElementById("pa-frais"); z.textContent = "";
    const f = +S.epargne.frais || 0, bas = 0.25, p = R.projection, fin = p.length - 1;
    if (!f) {
      z.appendChild(el("p", "aide", "Inscrivez les frais de gestion de vos placements (RFG), bouton Modifier : les fonds communs coûtent souvent de 1,5 à 2,5 % par année ; les fonds indiciels négociés en bourse (FNB), de 0,1 à 0,5 %."));
      return;
    }
    const cetteAnnee = (p[0].placements - p[0].encaisse) * f / 100;
    const res = el("p", "resume");
    if (f > bas) {
      const avec = R.projeterAvec(R.hyp.rendement + f - bas), gain = (avec[fin].placements - p[fin].placements) / R.deflateur(fin);
      res.append(document.createTextNode(`À ${nb(f, 2)} % de frais, vos placements vous coûtent environ ${$(cetteAnnee)} cette année. Avec des FNB à ${nb(bas, 2)} %, vous auriez `),
        el("strong", null, `${$(gain)} de plus en ${p[fin].annee}`), document.createTextNode("."));
    } else res.append(document.createTextNode(`À ${nb(f, 2)} %, vos frais sont déjà bas : environ ${$(cetteAnnee)} cette année.`));
    z.appendChild(res);
    z.appendChild(el("p", "aide", "Le rendement des scénarios est après frais : on y ajoute la différence de frais. Un conseiller peut valoir ses frais (planification, discipline) : comparez ce qu'il vous offre à ce qu'il coûte."));
  }

  /* ============================================================
     DOSSIER POUR MES PROCHES : assurances, testament, documents, personnes-ressources.
     ============================================================ */
  const CHAMPS_DOSSIER = [
    { g: "Assurance vie" },
    { p: "dossier.vieCouverture", l: "Montant de la couverture", u: "$", s: 10000 },
    { p: "dossier.vieAssureur", l: "Assureur et numéro de police", t: "texte" },
    { p: "dossier.vieBeneficiaires", l: "Bénéficiaires", t: "texte" },
    { g: "Assurance invalidité" },
    { p: "dossier.invaliditeMensuelle", l: "Rente mensuelle", u: "$/mois", s: 100, h: "Une rente d'assurance invalidité individuelle, payée par vous, n'est généralement pas imposable." },
    { p: "dossier.invaliditeCarence", l: "Délai de carence", u: "jours", s: 15 },
    { p: "dossier.invaliditeAssureur", l: "Assureur et numéro de police", t: "texte" },
    { g: "Autres protections" },
    { p: "dossier.maladiesGraves", l: "Assurance maladies graves", u: "$", s: 5000 },
    { p: "dossier.testament", l: "Testament à jour", t: "check" },
    { p: "dossier.mandat", l: "Mandat de protection (inaptitude)", t: "check" },
    { p: "dossier.procuration", l: "Procuration bancaire", t: "check" },
    { g: "Où trouver quoi" },
    { p: "dossier.documents", l: "Documents : testament, polices, relevés", t: "texte", long: true, ph: "Coffre-fort, notaire, dossier numérique…" },
    { p: "dossier.notaire", l: "Notaire", t: "texte" },
    { p: "dossier.comptable", l: "Comptable", t: "texte" },
    { p: "dossier.conseiller", l: "Conseiller financier", t: "texte" },
    { p: "dossier.notes", l: "Autres consignes", t: "texte", long: true },
  ];
  function champTexte(c, def) {
    const id = "c-" + def.p.replace(/\./g, "-"), ligne = el("div", "champ large"), lab = el("label", null, def.l); lab.htmlFor = id;
    const boite = el("div", "saisie"), inp = el(def.long ? "textarea" : "input"); inp.id = id; inp.dataset.p = def.p;
    if (!def.long) inp.type = "text"; else inp.rows = 3;
    if (def.ph) inp.placeholder = def.ph;
    boite.appendChild(inp); ligne.append(lab, boite, el("span")); c.appendChild(ligne);
  }
  function feuilleDossier() {
    ouvrirFeuille("Dossier pour mes proches", c => {
      c.appendChild(el("p", "aide feuille-intro", "Ce que vos proches doivent savoir si vous devenez inapte ou décédez. Reste sur cet appareil ; le rapport PDF en fait une page à ranger avec vos documents."));
      let groupe = c;
      for (const d of CHAMPS_DOSSIER) {
        if (d.g) { groupe = el("div", "groupe"); groupe.appendChild(el("h3", null, d.g)); c.appendChild(groupe); continue; }
        if (d.t === "texte") champTexte(groupe, d);
        else groupe.appendChild(creerChamp(d, "c-" + d.p.replace(/\./g, "-"), inp => { inp.dataset.p = d.p; }, false));
      }
    });
  }
  // Besoin d'assurance vie, ordre de grandeur : dettes, dix ans de dépenses s'il y a des personnes
  // à charge, frais au décès ; moins les placements (le REER, après l'impôt au décès).
  function analyseDossier(R) {
    const D = S.dossier || {}, e = S.epargne, charge = R.couple || S.epargne.reee.enfants.length > 0;
    const dettes = S.dettes.reduce((t, d) => t + d.solde * (d.partMoi ?? 100) / 100, 0);
    const avoirs = e.encaisse + e.celi.solde + ((e.celiapp || {}).solde || 0) + e.reer.solde * 0.5;
    const besoin = Math.max(0, dettes + (charge ? 10 * (R.depMoi + R.dettesMoi) * 12 : 0) + 15000 - avoirs);
    const remplacement = (+D.invaliditeMensuelle || 0) / Math.max(1, R.netMoi);
    const elements = [["Assurance vie", (+D.vieCouverture || 0) > 0], ["Assurance invalidité", (+D.invaliditeMensuelle || 0) > 0], ["Testament à jour", !!D.testament],
      ["Mandat de protection", !!D.mandat], ["Où trouver les documents", !!(D.documents || "").trim()]];
    return { D, besoin, charge, remplacement, elements, faits: elements.filter(([, v]) => v).length };
  }
  function rendreDossier(R) {
    const z = document.getElementById("pa-dossier"); z.textContent = "";
    const A = analyseDossier(R), D = A.D;
    z.appendChild(rangees(el("div"), [
      { titre: "Assurance vie", sous: `Besoin estimé : ${$(A.besoin)}${A.charge ? " (dettes, 10 ans de dépenses, frais)" : " (dettes et frais)"}`,
        valeur: (+D.vieCouverture || 0) > 0 ? $(+D.vieCouverture) : "—", valeurSous: (+D.vieCouverture || 0) > 0 ? ((+D.vieCouverture >= A.besoin) ? "suffisante" : `il manque ${$(A.besoin - D.vieCouverture)}`) : "à inscrire", action: feuilleDossier },
      { titre: "Assurance invalidité", sous: `Votre revenu net : ${$(R.netMoi)} par mois`, valeur: (+D.invaliditeMensuelle || 0) > 0 ? `${$(+D.invaliditeMensuelle)} / mois` : "—",
        valeurSous: (+D.invaliditeMensuelle || 0) > 0 ? `${pct(A.remplacement, 0)} de votre revenu net` : "à inscrire", action: feuilleDossier },
      { titre: "Testament, mandat, documents", sous: A.elements.filter(([, v]) => !v).map(([n]) => n).join(", ") || "Tout est en place", valeur: `${A.faits} sur ${A.elements.length}`, action: feuilleDossier },
    ]));
    const a = el("div", "actions"), b = el("button", "bouton secondaire", "Remplir le dossier"); b.type = "button"; b.addEventListener("click", feuilleDossier); a.appendChild(b); z.appendChild(a);
  }

  /* ============================================================
     PATRIMOINE : bilan d'aujourd'hui, réel comparé au plan, objectifs
     d'épargne et « où mettre le prochain 1 000 $ ».
     ============================================================ */
  const TYPES_ACTIF = {
    immobilier: { nom: "Immobilier : chalet, terrain, immeuble", croissance: 3 },
    placement: { nom: "Placements non enregistrés", croissance: 5 },
    entreprise: { nom: "Parts d'une entreprise ou d'une clinique", croissance: 0 },
    vehicule: { nom: "Véhicule, bateau, roulotte", croissance: -15 },
    equipement: { nom: "Équipement professionnel", croissance: -20 },
    autre: { nom: "Autre bien", croissance: 0 },
  };
  const CHAMPS_ACTIF = [
    { k: "nom", l: "Nom", t: "text", ph: "Chalet, terrain, bateau…" },
    { k: "type", l: "Type", t: "select", o: Object.entries(TYPES_ACTIF).map(([k, t]) => [k, t.nom]) },
    { k: "valeur", l: "Valeur aujourd'hui", u: "$", s: 1000 },
    { k: "croissance", l: "Hausse ou baisse de valeur par année", u: "%/an", s: 0.5, neg: true, h: "Négatif pour un bien qui perd de la valeur. Une dette liée, comme l'hypothèque du chalet, s'inscrit dans les dettes (page Budget)." },
    { k: "partMoi", l: "Votre part", u: "%", s: 1 },
  ];
  const TYPES_OBJECTIF = {
    urgence: { nom: "Fonds d'urgence", sous: "Environ 3 mois de dépenses et de paiements", depenser: false },
    maison: { nom: "Mise de fonds pour une maison", sous: "Avec le CELIAPP : déduction et retrait sans impôt", depenser: false },
    auto: { nom: "Prochaine auto", sous: "Payée comptant plutôt qu'à crédit", depenser: true },
    conge: { nom: "Congé parental ou sabbatique", sous: "Vos dépenses pendant l'arrêt de travail", depenser: true },
    voyage: { nom: "Voyage", sous: "Mis de côté chaque mois plutôt que sur la carte", depenser: true },
    autre: { nom: "Autre objectif", sous: "Montant et date de votre choix", depenser: false },
  };
  const CHAMPS_OBJECTIF = [
    { k: "nom", l: "Nom", t: "text", ph: "Fonds d'urgence, voyage…" },
    { k: "cible", l: "Montant visé", u: "$", s: 500 },
    { k: "date", l: "Date visée", t: "month" },
    { k: "compte", l: "Où l'argent s'accumule", t: "select", o: Object.entries(COMPTES_OBJECTIF) },
    { k: "deja", l: "Déjà accumulé", u: "$", s: 100, seul: o => o.compte === "dedie" },
    { k: "depenser", l: "L'argent sera dépensé à cette date", t: "check", seul: o => o.compte === "dedie", h: "Auto, voyage, congé : l'argent sort de la valeur nette à la date visée. Sinon, il reste placé (fonds d'urgence, mise de fonds)." },
  ];
  const dateMois = ym => { const [y, m] = String(ym || "").split("-").map(Number); return y && m ? new Date(y, m - 1, 1) : null; };
  const dansMois = n => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
  const dateLongue = iso => new Date(iso + "T00:00:00").toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });

  // Champs d'un élément de liste (actif, objectif) : nom libre, nombres, listes, cases.
  function champsElement(c, nomListe, i, defs) {
    const x = tableau(nomListe)[i];
    for (const ch of defs) {
      if (ch.seul && !ch.seul(x)) continue;
      const id = `${nomListe}-${x.id}-${ch.k}`;
      let ligne;
      if (ch.t === "text") {
        ligne = el("div", "champ large"); const lab = el("label", null, ch.l); lab.htmlFor = id;
        const boite = el("div", "saisie"), inp = el("input"); inp.type = "text"; inp.id = id; inp.value = x[ch.k] || ""; if (ch.ph) inp.placeholder = ch.ph;
        lierListe(nomListe, i, ch.k)(inp); boite.appendChild(inp); ligne.append(lab, boite, el("span"));
      } else {
        ligne = creerChamp(ch, id, lierListe(nomListe, i, ch.k), false);
        const inp = ligne.querySelector("input, select");
        if (inp.type === "checkbox") inp.checked = !!x[ch.k]; else inp.value = x[ch.k] ?? "";
      }
      c.appendChild(ligne);
    }
  }
  function boutonRetirer(c, nomListe, i, texte) {
    const ac = el("div", "feuille-actions");
    const x = el("button", "bouton danger large", texte); x.type = "button"; x.dataset.suppr = nomListe; x.dataset.i = i;
    ac.appendChild(x); c.appendChild(ac);
  }
  function feuilleActif(i) {
    ouvrirFeuille(S.actifs.autres[i].nom || "Actif", c => {
      champsElement(c, "actifsAutres", i, CHAMPS_ACTIF);
      boutonRetirer(c, "actifsAutres", i, "Retirer cet actif");
    });
  }
  function ajouterActif() {
    S.actifs.autres = S.actifs.autres || [];
    S.actifs.autres.push({ id: nouvelId("x"), nom: "", type: "immobilier", valeur: 0, croissance: TYPES_ACTIF.immobilier.croissance, partMoi: 100 });
    S.meta.exemple = false; sauver(); tout();
    feuilleActif(S.actifs.autres.length - 1);
  }
  function feuilleObjectif(i) {
    ouvrirFeuille(S.objectifs[i].nom || "Objectif", c => {
      const total = el("div", "feuille-total"); c.appendChild(total);
      feuilleCourante.maj = () => {
        const o = R && R.objectifs[i]; if (!o) return;
        total.textContent = "";
        total.append(el("span", null, o.atteint ? "Objectif atteint" : o.mois ? "À mettre de côté" : "Date passée"), el("strong", null, o.atteint || !o.mois ? $(o.solde) : `${$(o.mensuel)} / mois`));
      };
      feuilleCourante.maj();
      champsElement(c, "objectifs", i, CHAMPS_OBJECTIF);
      c.appendChild(el("p", "aide", "Compte à part : le montant mensuel s'ajoute à l'épargne du budget et à la valeur nette. CELI, CELIAPP, REER ou comptes : on compare plutôt vos cotisations prévues au montant nécessaire."));
      boutonRetirer(c, "objectifs", i, "Retirer cet objectif");
    });
  }
  function feuilleNouvelObjectif() {
    ouvrirFeuille("Nouvel objectif", c => {
      c.appendChild(el("p", "aide feuille-intro", "Choisissez un point de départ : le montant et la date se modifient ensuite."));
      c.appendChild(rangees(el("div"), Object.entries(TYPES_OBJECTIF).map(([k, t]) => ({ titre: t.nom, sous: t.sous, action: () => ajouterObjectif(k) }))));
    });
  }
  function ajouterObjectif(type) {
    const besoin = Math.round((R.depMoi + R.dettesMoi) / 100) * 100;
    const [cible, n] = { urgence: [3 * besoin, 12], maison: [50000, 36], auto: [S.actifs.voiture.prixNeuf || 40000, 36], conge: [6 * besoin, 24], voyage: [8000, 12], autre: [10000, 24] }[type];
    S.objectifs = S.objectifs || [];
    S.objectifs.push({ id: nouvelId("o"), type, nom: type === "autre" ? "" : TYPES_OBJECTIF[type].nom, cible: Math.max(500, cible), date: dansMois(n),
      compte: type === "maison" && R.locataire ? "celiapp" : "dedie", deja: 0, depenser: TYPES_OBJECTIF[type].depenser });
    S.meta.exemple = false; sauver(); tout();
    feuilleObjectif(S.objectifs.length - 1);
  }

  // Bilan d'aujourd'hui : ce que vous possédez, ce que vous devez.
  function rendreBilan(R, couple) {
    const x = R.projection[0], e = S.epargne, z = document.getElementById("pa-bilan"); z.textContent = "";
    const epargne = () => ouvrirSection("epargne");
    const actifs = [
      { titre: "Comptes et encaisse", valeur: e.encaisse, action: epargne, garder: true },
      { titre: "REER", valeur: e.reer.solde, action: epargne, garder: true },
      { titre: "CELI", valeur: e.celi.solde, action: epargne, garder: true },
      { titre: "CELIAPP", valeur: (e.celiapp || {}).solde || 0, action: epargne },
      ...R.objectifs.map((o, i) => o.dedie && o.solde > 0 && { titre: o.nom || "Objectif", sous: "Épargne d'un objectif", valeur: o.solde, action: () => feuilleObjectif(i) }),
      couple && { titre: `Épargne de ${votreP()}`, valeur: x.conjointe, action: () => ouvrirSection("menage") },
      R.societeActive && { titre: "Placements dans la société", valeur: x.societe, action: () => ouvrirSection("impot") },
      !R.locataire && { titre: couple ? "Maison, part du couple" : "Maison, votre part", valeur: couple ? x.maisonMenage : x.maisonMoi, action: epargne, garder: true },
      { titre: couple ? "Autos" : "Auto", valeur: couple ? x.voitureMenage : x.voitureMoi, action: epargne },
      ...(S.actifs.autres || []).map((a, i) => ({ titre: a.nom || "Actif sans nom", sous: (TYPES_ACTIF[a.type] || TYPES_ACTIF.autre).nom,
        valeur: (+a.valeur || 0) * (couple ? 1 : (a.partMoi ?? 100) / 100), action: () => feuilleActif(i), garder: true })),
    ].filter(a => a && (a.garder || Math.abs(a.valeur) >= 0.5));
    const passifs = S.dettes.map((d, i) => ({ titre: d.nom, sous: `${nb(d.taux, 2)} %${!couple && (d.partMoi ?? 100) < 100 ? ` · votre part : ${nb(d.partMoi)} %` : ""}`,
      valeur: d.solde * (couple ? 1 : (d.partMoi ?? 100) / 100), action: () => feuilleDette(i) }));
    const tA = actifs.reduce((t, a) => t + a.valeur, 0), tP = passifs.reduce((t, a) => t + a.valeur, 0);
    const bloc = (titre, lignes, total, plus) => {
      const b = el("div", "bilan-bloc"); b.appendChild(el("h3", null, titre));
      b.appendChild(rangees(el("div"), [...lignes.map(l => ({ ...l, valeur: $(l.valeur) })), plus, { titre: "Total", cls: "total", valeur: $(total) }]));
      return b;
    };
    z.append(
      bloc("Ce que vous possédez", actifs, tA, { titre: "Ajouter un actif", sous: "Chalet, terrain, placements, parts de clinique…", ico: "plus", cls: "ajout", action: ajouterActif }),
      bloc("Ce que vous devez", passifs, tP, null),
    );
    const vn = el("div", "bilan-net"); vn.append(el("span", null, couple ? "Valeur nette du couple" : "Votre valeur nette"), el("strong", null, $(x[couple ? "menage" : "moi"])));
    z.appendChild(vn);
    document.getElementById("pa-bilan-sous").textContent = (S.suivi && S.suivi.instantanes.length) ? `Notée le ${dateLongue(S.suivi.instantanes[S.suivi.instantanes.length - 1].date)}` : "";
  }

  // Réel comparé au plan : la valeur nette notée de temps en temps, sur le plan de référence.
  function feuilleNoter() {
    ouvrirFeuille("Noter ma situation", c => {
      c.appendChild(el("p", "aide feuille-intro", "Mettez vos soldes à jour d'après vos relevés, puis notez. La valeur nette se recalcule à mesure."));
      const total = el("div", "feuille-total"); c.appendChild(total);
      feuilleCourante.maj = () => { total.textContent = ""; total.append(el("span", null, "Votre valeur nette"), el("strong", null, $(R.projection[0].moi))); };
      feuilleCourante.maj();
      construireChamps(c, [{ g: "Comptes et biens" }, ...CHAMPS.epargne.filter(ch => ["epargne.encaisse", "epargne.reer.solde", "epargne.celi.solde", "epargne.celiapp.solde", "actifs.maison.valeur", "actifs.voiture.valeur"].includes(ch.p))]);
      // Une liste (actifs, objectifs, dettes) : un champ par élément retenu, lié à sa place dans la liste.
      const liste = (titre, nomListe, garder, k, nom) => {
        const l = (tableau(nomListe) || []).map((x, i) => [x, i]).filter(([x]) => garder(x));
        if (!l.length) return;
        const g = el("div", "groupe"); g.appendChild(el("h3", null, titre)); c.appendChild(g);
        l.forEach(([x, i]) => { const ligne = creerChamp({ l: nom(x), u: "$", s: 100 }, `nt-${nomListe}-${x.id}`, lierListe(nomListe, i, k), false); ligne.querySelector("input").value = x[k] ?? ""; g.appendChild(ligne); });
      };
      liste("Autres actifs", "actifsAutres", () => true, "valeur", x => x.nom || "Actif");
      liste("Objectifs : déjà accumulé", "objectifs", o => o.compte === "dedie", "deja", x => x.nom || "Objectif");
      liste("Dettes : solde", "dettes", () => true, "solde", x => x.nom);
      const a = el("div", "feuille-actions"), b = el("button", "bouton large", "Noter cette situation"); b.type = "button";
      b.addEventListener("click", () => { feuille.close(); noterSituation(); });
      a.appendChild(b); c.appendChild(a);
    });
  }
  function referenceDe(R) {
    const p = R.projection;
    return { date: new Date().toISOString().slice(0, 10), scenario: R.scenario, annees: p.map(y => y.annee), moi: p.map(y => Math.round(y.moi)), menage: p.map(y => Math.round(y.menage)) };
  }
  function noterSituation() {
    R = calculer();
    const auj = new Date().toISOString().slice(0, 10), x = R.projection[0];
    S.suivi = S.suivi || { reference: null, instantanes: [] };
    // Un seul relevé par jour : le plus récent remplace celui du même jour.
    S.suivi.instantanes = S.suivi.instantanes.filter(i => i.date !== auj).concat({ date: auj, moi: Math.round(x.moi), menage: Math.round(x.menage) })
      .sort((a, b) => a.date < b.date ? -1 : 1);
    if (!S.suivi.reference) S.suivi.reference = referenceDe(R);
    S.meta.exemple = false; sauver(); tout();
    toast("Situation notée. Revenez dans quelques mois, après avoir mis vos soldes à jour.");
  }
  function rendreReel(R, couple) {
    const z = document.getElementById("pa-reel"); z.textContent = "";
    const su = S.suivi || { reference: null, instantanes: [] }, cle = couple ? "menage" : "moi";
    const bouton = (texte, cls, f) => { const b = el("button", "bouton " + cls, texte); b.type = "button"; b.addEventListener("click", f); return b; };
    const actions = el("div", "actions");
    if (!su.instantanes.length || !su.reference) {
      z.appendChild(el("p", "aide", "Notez votre valeur nette aujourd'hui : elle devient votre point de départ, et la projection, votre plan de référence. Dans quelques mois, mettez vos soldes à jour et notez-la de nouveau : vous verrez si vous êtes en avance ou en retard sur le plan."));
      actions.appendChild(bouton("Noter ma situation aujourd'hui", "", feuilleNoter)); z.appendChild(actions); return;
    }
    const ref = su.reference, d0 = new Date(ref.date + "T00:00:00");
    const ans = d => Math.max(0, (new Date(d + "T00:00:00") - d0) / (365.25 * 864e5));
    const plan = f => { const v = ref[cle] || ref.moi, i = Math.min(v.length - 1, f), a = Math.floor(i), b = Math.min(v.length - 1, a + 1); return v[a] + (v[b] - v[a]) * (i - a); };
    const dern = su.instantanes[su.instantanes.length - 1], ecart = dern[cle] - plan(ans(dern.date));
    const res = el("p", "resume");
    res.append(document.createTextNode(`Le ${dateLongue(dern.date)}, ${couple ? "la valeur nette du couple" : "votre valeur nette"} était de `), el("strong", null, $(dern[cle])),
      document.createTextNode(su.instantanes.length > 1 || ans(dern.date) > 0.02 ? `, ${ecart >= 0 ? "en avance" : "en retard"} de ${$(Math.abs(ecart))} sur le plan du ${dateLongue(ref.date)}.` : ". C'est votre point de départ : notez-la de nouveau dans quelques mois."));
    z.appendChild(res);
    const n = Math.min(ref.annees.length - 1, Math.max(3, Math.ceil(ans(dern.date)) + 2));
    const leg = el("div", "legende"), g = el("div", "graphique"); z.append(leg, g);
    graphiqueLignes(g, leg, [{ nom: "Plan de référence", couleur: SERIES[0], valeurs: (ref[cle] || ref.moi).slice(0, n + 1) }], ref.annees.slice(0, n + 1).map(String), {
      titre: "Valeur nette notée et plan de référence", hauteur: 190, baseLibre: true,
      points: su.instantanes.map(x => ({ i: ans(x.date), v: x[cle], couleur: SERIES[2] })),
      legende: [{ nom: "Plan de référence", couleur: SERIES[0] }, { nom: "Valeur nette notée", couleur: SERIES[2] }],
    });
    z.appendChild(rangees(el("div"), su.instantanes.slice(-5).reverse().map(x => {
      const p = plan(ans(x.date)), e = x[cle] - p;
      return { titre: dateLongue(x.date), sous: `Plan : ${$(p)}`, valeur: $(x[cle]), valeurSous: `${signe(e)} sur le plan` };
    })));
    actions.append(bouton("Noter ma situation aujourd'hui", "", feuilleNoter), bouton("Repartir d'un nouveau plan", "secondaire", () => {
      const avant = S.suivi.reference; S.suivi.reference = referenceDe(R); sauver(); tout();
      toast("Nouveau plan de référence : la projection d'aujourd'hui.", () => { S.suivi.reference = avant; sauver(); tout(); });
    }));
    z.appendChild(actions);
  }

  // Objectifs : progression et montant à mettre de côté chaque mois.
  function rendreObjectifs(R) {
    const z = document.getElementById("pa-objectifs"); z.textContent = "";
    R.objectifs.forEach((o, i) => {
      const b = el("button", "objectif" + (o.atteint ? " atteint" : "")); b.type = "button"; b.addEventListener("click", () => feuilleObjectif(i));
      const tete = el("span", "objectif-tete"); tete.append(el("strong", null, o.nom || "Objectif"), el("span", null, `${$(o.solde)} sur ${$(+o.cible || 0)}`));
      const j = el("span", "jauge"), sp = el("span"); sp.style.width = `${Math.min(100, (+o.cible ? o.solde / o.cible : 1) * 100)}%`; j.appendChild(sp);
      const d = dateMois(o.date), quand = d ? `D'ici ${moisAn(d)}` : "Date à préciser";
      const compte = COMPTES_OBJECTIF[o.compte] || COMPTES_OBJECTIF.dedie;
      const etat = o.atteint ? "Atteint"
        : !o.mois ? "Date passée : choisissez une nouvelle date"
        : o.dedie ? `${$(o.mensuel)} par mois, compté dans l'épargne du budget`
        : o.prevu + 0.5 >= o.mensuel ? `Vos cotisations ${compte} (${$(o.prevu)} par mois) suffisent`
        : `Il manque ${$(o.mensuel - o.prevu)} par mois dans votre ${compte}`;
      b.append(tete, j, el("span", "objectif-sous", `${quand} · ${etat}`));
      z.appendChild(b);
    });
    if (!R.objectifs.length) z.appendChild(el("p", "aide", "Fonds d'urgence, mise de fonds, prochaine auto, congé parental, voyage : un montant et une date donnent ce qu'il faut mettre de côté chaque mois."));
    z.appendChild(rangees(el("div"), [{ titre: "Ajouter un objectif", ico: "plus", cls: "ajout", action: feuilleNouvelObjectif }]));
  }

  // Où mettre le prochain 1 000 $ : valeur dans 10 ans de chaque choix, après impôt.
  function optionsProchain(R) {
    const N = 10, r = R.hyp.rendement / 100, f = Math.pow(1 + r, N), t = R.tauxDeduction, tr = (S.epargne.tauxRetrait ?? 35) / 100;
    const o = [
      { titre: "CELI", sous: "Croissance et retraits sans impôt", v: 1000 * f },
      { titre: "REER", sous: `Remboursement de ${pct(t, 0)} placé au CELI ; retrait imposé à ${pct(tr, 0)}`, v: 1000 * f * (1 - tr + t) },
    ];
    const ca = S.epargne.celiapp || {};
    if (R.locataire && (ca.solde || 0) < 40000 && (ca.cotisationAnnuelle || 0) < 8000)
      o.push({ titre: "CELIAPP", sous: `Déduction de ${pct(t, 0)} et retrait sans impôt pour une première maison`, v: 1000 * f * (1 + t) });
    if (S.epargne.reee.enfants.some(e => e.age < 17) && S.epargne.reee.cotisationAnnuelle < 2500)
      o.push({ titre: "REEE", sous: "Subventions de 30 % jusqu'à 2 500 $ par enfant par année ; retraits imposés au nom de l'étudiant", v: 1300 * f });
    S.dettes.forEach(d => {
      if (!(d.solde > 0) || !(d.taux > 0)) return;
      const eff = d.taux / 100 * (1 - (d.creditImpot || 0) / 100);
      o.push({ titre: `Rembourser : ${d.nom}`, sous: `${nb(eff * 100, 2)} % d'intérêt évité, sans risque${d.creditImpot ? " (après le crédit d'impôt)" : ""}${d.type === "hypotheque" ? " ; dans la limite du remboursement anticipé" : ""}`, v: 1000 * Math.pow(1 + eff, N) });
    });
    return o.sort((a, b) => b.v - a.v);
  }
  function rendreProchain(R) {
    const z = document.getElementById("pa-prochain"); z.textContent = "";
    const reserve = S.epargne.encaisse + S.epargne.celi.solde, besoin = 3 * (R.depMoi + R.dettesMoi);
    if (reserve < besoin && !(S.objectifs || []).some(o => o.type === "urgence"))
      z.appendChild(el("p", "aide avertissement", `D'abord, un fonds d'urgence : environ ${$(besoin)}, soit 3 mois de dépenses et de paiements. Ajoutez-le dans « Vos objectifs ».`));
    const o = optionsProchain(R);
    z.appendChild(rangees(el("div"), o.map((x, i) => ({ titre: x.titre, sous: x.sous, ico: i === 0 ? "ok" : String(i + 1), cls: i === 0 ? "choisi" : null,
      valeur: $(x.v), valeurSous: `${pct(Math.pow(x.v / 1000, 1 / 10) - 1, 1)} par année` }))));
    z.appendChild(el("p", "aide", `Valeur dans 10 ans de 1 000 $ mis aujourd'hui, au rendement du scénario ${SCENARIOS[R.scenario].toLowerCase()} (${nb(R.hyp.rendement, 1)} %). Le rendement des placements n'est pas garanti ; l'intérêt évité en remboursant une dette, oui. Le REER passe devant le CELI quand votre taux d'imposition au retrait (${pct((S.epargne.tauxRetrait ?? 35) / 100, 0)}, modifiable dans Modifier) est plus bas que votre taux d'imposition d'aujourd'hui (${pct(R.tauxDeduction, 0)}).`));
  }

  /* Dépenses annuelles : quand elles tombent, et ce qu'il faut mettre de côté chaque mois. */
  const MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  function lignesAnnuelles() {
    const l = depensesEffectives().filter(b => b.periode === "an" && b.montant > 0 && !String(b.id).startsWith("total-"))
      .map(b => ({ nom: nomDepense(b), montant: +b.montant, mois: +b.mois || 0, liste: "budget", i: S.budget.indexOf(b) }));
    if (S.impot.depensesProMode === "detail") S.impot.depensesProDetail.forEach((x, i) => {
      if (x.periode === "an" && x.montant > 0) l.push({ nom: ITEMS_PRO.get(x.k).nom, montant: +x.montant, mois: +x.mois || 0, liste: "depensesPro", i, pro: true });
    });
    return l;
  }
  function rendreAnnuelles() {
    const z = document.getElementById("bu-annuelles"); z.textContent = "";
    const l = lignesAnnuelles();
    if (!l.length) { z.appendChild(el("p", "aide", "Aucune dépense annuelle. Assurance auto, taxes, cotisation du Collège, vacances : inscrivez-les « / an » dans leur catégorie, puis choisissez leur mois ici.")); return; }
    const total = l.reduce((t, x) => t + x.montant, 0), mc = new Date().getMonth();
    const res = el("p", "resume");
    res.append(document.createTextNode(`${$(total)} par année : mettez `), el("strong", null, `${$(total / 12)} de côté chaque mois`), document.createTextNode(" dans un compte à part, pour les payer sans toucher à la marge."));
    z.appendChild(res);
    // Les douze mois, à partir de ce mois-ci.
    const parMois = Array(12).fill(0); l.forEach(x => { if (x.mois) parMois[x.mois - 1] += x.montant; });
    const max = Math.max(1, ...parMois), barres = el("div", "mois-barres"); barres.setAttribute("role", "img");
    barres.setAttribute("aria-label", parMois.map((v, m) => v ? `${MOIS_LONGS[m]} ${$(v)}` : null).filter(Boolean).join(", ") || "Mois à préciser");
    for (let k = 0; k < 12; k++) {
      const m = (mc + k) % 12, col = el("div", "col" + (k === 0 ? " courant" : "")), b = el("span", "b");
      b.style.height = `${Math.max(2, parMois[m] / max * 100)}%`; if (parMois[m]) b.title = `${MOIS_LONGS[m]} : ${$(parMois[m])}`;
      col.append(b, el("span", "l", MOIS_LONGS[m].slice(0, 1).toUpperCase())); barres.appendChild(col);
    }
    z.appendChild(barres);
    const ordre = x => x.mois ? (x.mois - 1 - mc + 12) % 12 : 99;
    const tries = [...l].sort((a, b) => ordre(a) - ordre(b));
    rangees(z.appendChild(el("div")), [...tries.slice(0, 6).map(x => ({ titre: x.nom, sous: `${x.mois ? `En ${MOIS_LONGS[x.mois - 1]}` : "Mois à préciser"}${x.pro ? " · professionnelle" : ""}`, valeur: $(x.montant), action: feuilleAnnuelles })),
      tries.length > 6 ? { titre: `${tries.length - 6} autre${tries.length > 7 ? "s" : ""}`, action: feuilleAnnuelles } : null]);
  }
  function feuilleAnnuelles() {
    ouvrirFeuille("Dépenses annuelles", c => {
      c.appendChild(el("p", "aide feuille-intro", "Le mois où chaque dépense annuelle est payée : elles apparaissent dans les échéances de l'aperçu."));
      lignesAnnuelles().forEach(x => {
        const ligne = creerChamp({ l: `${x.nom} · ${$(x.montant)}`, t: "select", o: [["", "Mois à préciser"], ...MOIS_LONGS.map((m, k) => [String(k + 1), m[0].toUpperCase() + m.slice(1)])] },
          `an-${x.liste}-${x.i}`, lierListe(x.liste, x.i, "mois"), false);
        ligne.querySelector("select").value = x.mois ? String(x.mois) : "";
        c.appendChild(ligne);
      });
    });
  }

  /* ============================================================
     CARTE « VOTRE PORTRAIT » : ce qui est rempli, et la suite proposée.
     ============================================================ */
  // Sections déjà ouvertes (revenu, patrimoine), gardées avec les données.
  const vus = () => (S.meta.vus = S.meta.vus || {});
  function voir(cle) { if (!vus()[cle]) { vus()[cle] = true; sauver(); } }
  // Catégories du budget à remplir : « Enfants » seulement s'il y a des enfants (ou déjà des montants).
  const categoriesBudget = () => CATALOGUE.map(x => x.cat).filter(g => g !== "Enfants" || S.epargne.reee.enfants.length || S.budget.some(b => categorie(b) === g && b.montant > 0));
  const categorieRemplie = g => totalActif(g) || S.budget.some(b => categorie(b) === g && b.montant > 0);
  const ancienParcours = nom => (((S.meta.parcours || {})[nom]) || []).length > 0;

  // Carte « Votre portrait » de l'aperçu : ce qui est rempli, et la suite proposée.
  function portrait() {
    // Budget : six catégories remplies suffisent (certaines ne s'appliquent pas à tout le monde).
    const cats = categoriesBudget(), nCat = cats.filter(categorieRemplie).length, viseCat = Math.min(6, cats.length);
    const ep = S.epargne, epargne = vus().patrimoine || ancienParcours("autres") || ep.encaisse > 0 || ep.reer.solde > 0 || ep.reer.droits > 0 || ep.celi.solde > 0;
    const items = [
      { titre: "Votre situation", sous: "Famille, pratique, logement, dettes", f: S.meta.exemple ? 0 : 1, poids: 15, action: ouvrirAssistant },
      { titre: "Vos revenus", sous: "Pratique, clientèle, activités, autres revenus", f: vus().revenu || ancienParcours("revenus") ? 1 : 0, poids: 35, action: () => { ouvrir("revenu"); ouvrirSection("revenu"); } },
      { titre: "Votre budget", sous: `${nCat} catégorie${nCat > 1 ? "s" : ""} remplie${nCat > 1 ? "s" : ""}`, f: Math.min(1, nCat / viseCat), poids: 35, action: () => ouvrir("budget") },
      { titre: "Votre patrimoine", sous: "Épargne, biens et objectifs", f: epargne ? 1 : 0, poids: 10, action: () => { voir("patrimoine"); ouvrir("avenir"); } },
      { titre: "Une copie de sauvegarde", sous: "Vos données ne vivent que dans ce navigateur", f: S.meta.dernierExport ? 1 : 0, poids: 5, action: () => ouvrir("donnees") },
    ];
    const total = items.reduce((t, x) => t + x.poids, 0);
    return { items, pct: Math.round(items.reduce((t, x) => t + x.poids * x.f, 0) / total * 100) };
  }
  const portraitMasque = () => { try { return sessionStorage.getItem("wm.portrait") === "masque"; } catch (e) { return false; } };
  function rendrePortrait() {
    const carte = document.getElementById("ap-portrait"), P = portrait();
    carte.hidden = S.meta.exemple || P.pct >= 100 || portraitMasque();
    if (carte.hidden) return;
    document.getElementById("ap-portrait-titre").textContent = `Votre portrait : ${P.pct} % complété`;
    const j = carte.querySelector(".jauge"); j.setAttribute("aria-valuenow", P.pct); j.firstElementChild.style.width = P.pct + "%";
    rangees("ap-portrait-liste", P.items.map((x, i) => ({ titre: x.titre, sous: x.sous, ico: x.f >= 1 ? "ok" : String(i + 1), cls: x.f >= 1 ? "fait" : null, action: x.action })));
    const suite = P.items.find(x => x.f < 1);
    document.getElementById("ap-portrait-suite").textContent = suite ? `Continuer : ${suite.titre.toLowerCase()}` : "Continuer";
    document.getElementById("ap-portrait-suite").onclick = suite ? suite.action : null;
  }
  document.getElementById("bu-annuelles-modifier").addEventListener("click", feuilleAnnuelles);
  document.getElementById("exporter-tableur").addEventListener("click", exporterTableur);
  document.getElementById("imprimer-fiche").addEventListener("click", () => window.Wealthnord.rapport && window.Wealthnord.rapport.imprimer({ fiche: true }));
  document.getElementById("bandeau-plan-sortir").addEventListener("click", () => sortirPlan());
  document.getElementById("pa-independance-modifier").addEventListener("click", feuilleIndependance);
  document.getElementById("ap-portrait-masquer").addEventListener("click", () => {
    try { sessionStorage.setItem("wm.portrait", "masque"); } catch (e) { /* rien à garder */ }
    rendrePortrait(); toast("Carte masquée jusqu'à la prochaine ouverture de l'app.");
  });

  /* ============================================================
     ÉVÉNEMENTS
     ============================================================ */
  let minuterie = null;
  const plusTard = () => { clearTimeout(minuterie); minuterie = setTimeout(() => { sauver(); tout(); }, 120); };
  function valeur(inp) {
    if (inp.type === "checkbox") return inp.checked;
    if (inp.type === "number") { const v = parseFloat(String(inp.value).replace(",", ".")); return isFinite(v) ? (inp.dataset.neg ? v : Math.max(0, v)) : null; }
    return inp.value;
  }
  document.addEventListener("input", e => {
    const inp = e.target;
    if (inp.dataset.p) {
      const v = valeur(inp); if (v === null) return;
      if (inp.dataset.p === "revenu.milieu") { choisirMilieu(v); return; }
      if (inp.dataset.p.startsWith("revenu.tarifs.")) S.revenu.tarifsModifies = true;
      if (inp.dataset.p === "revenu.membreGmf") S.confirmes["revenu.membreGmf"] = true;   // l'alerte de l'Aperçu disparaît
      ecrire(inp.dataset.p, v); S.meta.exemple = false;
      majVisibilite();   // un champ peut en afficher ou en cacher d'autres
      if (inp.dataset.p === "conjointe.designation") { S.conjointe.designation = v; reconstruireFeuille(); }
      if (inp.dataset.p === "revenu.lieuTarifs" || inp.dataset.p === "revenu.listeEnseignement") { synchroniserTarifs(S); remplirChamps(); }
      plusTard();
    } else if (inp.dataset.l) {
      const v = valeur(inp); if (v === null) return;
      const item = tableau(inp.dataset.l)[+inp.dataset.i];
      item[inp.dataset.k] = v; S.meta.exemple = false;
      if (inp.dataset.k === "nom" && ["dettes", "enfants", "activites", "actifsAutres", "objectifs", "jalonsPerso"].includes(inp.dataset.l) && feuilleCourante) { feuilleCourante.titre = inp.dataset.l === "activites" ? nomActivite(item) : v || "Sans nom"; titreFeuille.textContent = feuilleCourante.titre; }
      if (inp.dataset.bool) item[inp.dataset.k] = v === "true";
      if (["budget", "lignes", "depensesPro"].includes(inp.dataset.l) && inp.dataset.k === "montant") inp.closest(".ligne-depense").classList.toggle("remplie", v > 0);
      if (inp.dataset.l === "dettes" && (inp.dataset.k === "type" || inp.dataset.k === "interetsSeulement")) { sauver(); reconstruireFeuille(); tout(); return; }
      // Nouveau type d'actif : sa hausse de valeur de départ, sauf si on l'a déjà changée.
      if (inp.dataset.l === "actifsAutres" && inp.dataset.k === "type") {
        if (TYPES_ACTIF[v] && Object.values(TYPES_ACTIF).some(t => t.croissance === +item.croissance)) item.croissance = TYPES_ACTIF[v].croissance;
        sauver(); reconstruireFeuille(); tout(); return;
      }
      if (inp.dataset.l === "objectifs" && inp.dataset.k === "compte") { sauver(); reconstruireFeuille(); tout(); return; }
      if (inp.dataset.l === "activites" && ["type", "frequence", "calcul"].includes(inp.dataset.k)) {
        // Nouveau type : ses valeurs de départ, sauf celles déjà modifiées (égales à celles d'un autre type).
        if (inp.dataset.k === "type" && ACTIVITES[v]) for (const k of ["parJour", "patients", "parPatient"])
          if (Object.values(ACTIVITES).some(t => t[k] === item[k])) item[k] = ACTIVITES[v][k];
        if (feuilleCourante) { feuilleCourante.titre = nomActivite(item); titreFeuille.textContent = feuilleCourante.titre; }
        sauver(); reconstruireFeuille(); tout(); return;
      }
      plusTard();
    }
  });
  document.addEventListener("change", e => { if (e.target.type === "checkbox" || e.target.tagName === "SELECT") e.target.dispatchEvent(new Event("input", { bubbles: true })); });
  document.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.conf) {
      S.confirmes[b.dataset.conf] = !S.confirmes[b.dataset.conf];
      b.setAttribute("aria-pressed", S.confirmes[b.dataset.conf] ? "true" : "false");
      sauver(); rendreFiabilite();
    } else if (b.dataset.suppr) {
      const nomListe = b.dataset.suppr, liste = tableau(nomListe), i = +b.dataset.i, [retire] = liste.splice(i, 1); sauver();
      const surPlace = nomListe === "budget" || nomListe === "lignes";
      if (surPlace) { reconstruireFeuille(); tout(); } else feuille.close();
      toast(`« ${nomListe === "activites" ? nomActivite(retire) : retire.nom || "Élément"} » supprimé.`, () => {
        tableau(nomListe).splice(i, 0, retire); sauver();
        if (surPlace) reconstruireFeuille();
        tout();
      });
    } else if (b.dataset.feuille) ouvrirSection(b.dataset.feuille);
  });

  /* Message en bas de l'écran ; « Annuler » défait la dernière suppression. */
  const boiteToast = document.getElementById("toast");
  let annulerToast = null, minuterieToast = null;
  // Message bref, avec au besoin un bouton d'action (« Annuler » par défaut).
  function toast(texte, annuler, libelle = "Annuler", duree = 6000) {
    // Un panneau ouvert est modal : le message y loge pour que le bouton reste cliquable.
    const hote = [feuille, document.getElementById("assistant")].find(d => d.open) || document.body;
    if (boiteToast.parentNode !== hote) hote.appendChild(boiteToast);
    document.getElementById("toast-texte").textContent = texte;
    annulerToast = annuler || null;
    const bouton = document.getElementById("toast-annuler");
    bouton.hidden = !annuler; bouton.textContent = libelle;
    boiteToast.hidden = false;
    clearTimeout(minuterieToast); minuterieToast = setTimeout(() => { boiteToast.hidden = true; annulerToast = null; }, duree);
  }
  document.getElementById("toast-annuler").addEventListener("click", () => {
    if (annulerToast) annulerToast();
    annulerToast = null; boiteToast.hidden = true;
  });

  /* Pages, avec la page ouverte dans l'adresse (#revenu, #impot…). */
  const ALIAS = { epargne: "avenir", patrimoine: "avenir" };
  function ouvrir(nom, sansRendu) {
    nom = ALIAS[nom] || nom;
    if (!document.getElementById("v-" + nom)) nom = "apercu";
    document.querySelectorAll(".nav [data-onglet], .barre-haut [data-onglet]").forEach(a => { if (a.dataset.onglet === nom) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    document.querySelectorAll(".vue").forEach(v => { v.hidden = v.id !== "v-" + nom; });
    if (location.hash !== "#" + nom) history.replaceState(null, "", "#" + nom);
    window.scrollTo(0, 0);
    if (R && !sansRendu) tout();   // les graphiques prennent la largeur de la page visible
  }
  window.addEventListener("hashchange", () => ouvrir(location.hash.slice(1)));
  // Le logo mène à l'accueil, même si on y est déjà (retour en haut).
  document.querySelectorAll("a.marque").forEach(a => a.addEventListener("click", e => { e.preventDefault(); ouvrir("apercu"); }));

  /* Import et export */
  const message = t => { document.getElementById("donnees-message").textContent = t; };
  document.getElementById("exporter").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(racine(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wealthmorand-donnees-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    S.meta.dernierExport = new Date().toISOString(); sauver(); tout();
    message("Sauvegarde exportée. Gardez-la dans un endroit sûr : elle contient toutes vos données.");
  });
  document.getElementById("importer").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        const d = JSON.parse(lecteur.result);
        if (!d || d.version !== 1 || !d.revenu || !Array.isArray(d.dettes)) throw new Error("format");
        sortirPlan(true); S = normaliser(fusion(clone(EXEMPLE), migrer(d))); S.meta.exemple = false; sauver();
        tout(); message(`Sauvegarde restaurée : ${S.dettes.length} dettes, ${S.budget.filter(b => b.montant > 0).length} dépenses inscrites.`);
      } catch (err) { message("Ce fichier n'est pas une sauvegarde WealthMorand. Rien n'a été changé."); }
    };
    lecteur.readAsText(f); e.target.value = "";
  });
  const reinit = document.getElementById("reinitialiser"), confirmer = document.getElementById("confirmer-reinit");
  reinit.addEventListener("click", () => { confirmer.hidden = false; confirmer.focus(); });
  confirmer.addEventListener("click", () => { sortirPlan(true); S = normaliser(clone(EXEMPLE)); sauver(); tout(); confirmer.hidden = true; message("Valeurs d'exemple rétablies."); });

  /* Apparence : automatique (selon l'appareil), claire ou sombre. */
  // Bouton lune / soleil, en haut à droite : passe du clair au sombre et l'inverse.
  const ICONE_LUNE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z"/></svg>';
  const ICONE_SOLEIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>';
  const sombreSysteme = matchMedia("(prefers-color-scheme: dark)");
  const enSombre = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && sombreSysteme.matches);
  function majBoutonsTheme() {
    const d = enSombre(), t = d ? "Passer au thème clair" : "Passer au thème sombre";
    document.querySelectorAll("[data-bascule-theme]").forEach(b => { b.innerHTML = d ? ICONE_SOLEIL : ICONE_LUNE; b.setAttribute("aria-label", t); b.title = t; });
  }
  document.querySelectorAll(".vue .tete-page").forEach(t => { const b = el("button", "bouton-icone tete-theme"); b.type = "button"; b.dataset.basculeTheme = ""; t.appendChild(b); });
  document.addEventListener("click", e => { if (e.target.closest("[data-bascule-theme]")) appliquerTheme(enSombre() ? "light" : "dark"); });
  sombreSysteme.addEventListener("change", majBoutonsTheme);
  const lireTheme = () => { try { return localStorage.getItem("wealthnord.theme") || "auto"; } catch (e) { return "auto"; } };
  function appliquerTheme(v) {
    try { if (v === "auto") localStorage.removeItem("wealthnord.theme"); else localStorage.setItem("wealthnord.theme", v); } catch (e) { /* choix non gardé */ }
    if (v === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v;
    // Couleur de la barre du navigateur, assortie au fond.
    const fond = getComputedStyle(document.documentElement).getPropertyValue("--fond").trim();
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => { if (v === "auto") m.setAttribute("content", m.media.includes("dark") ? "#0e0e0d" : "#f5f4f0"); else m.setAttribute("content", fond); });
    segment("theme-choix", [["auto", "Automatique"], ["light", "Clair"], ["dark", "Sombre"]], v, appliquerTheme, "Apparence");
    majBoutonsTheme();
    if (R) tout();
  }
  appliquerTheme(lireTheme());
  // Rapport PDF : mis en page à part (js/rapport.js), puis « Enregistrer en PDF » du navigateur.
  const rapportPdf = () => (window.Wealthnord.rapport ? window.Wealthnord.rapport.imprimer() : window.print());
  document.getElementById("imprimer").addEventListener("click", rapportPdf);
  document.getElementById("rapport-pdf").addEventListener("click", rapportPdf);
  document.getElementById("rv-milieu").addEventListener("change", e => choisirMilieu(e.target.value));
  document.getElementById("rv-ajout-activite").addEventListener("click", ajouterActivite);
  document.getElementById("rv-autres-modifier").addEventListener("click", feuilleAutresRevenus);
  document.getElementById("im-pro-modifier").addEventListener("click", feuilleDepensesPro);
  document.getElementById("de-ajout").addEventListener("input", majSimulation);
  // Plan de remboursement mois par mois, en CSV (séparateur « ; », virgule décimale, pour Excel en français).
  document.getElementById("exporter-plan").addEventListener("click", () => {
    const sim = R.sim, fin = sim.iLibre >= 0 ? sim.iLibre + 1 : sim.mois.length;
    const montant = v => v.toFixed(2).replace(".", ",");
    const texte = c => `"${String(c).replace(/"/g, '""')}"`;
    const lignesCsv = [["Mois", ...S.dettes.map(d => d.nom), "Total des dettes", "Mis de côté pour un renouvellement"].map(texte).join(";")];
    sim.mois.slice(0, fin).forEach(m => lignesCsv.push([m.date.toISOString().slice(0, 7), ...m.soldes.map(montant), montant(m.total), montant(m.reserve || 0)].join(";")));
    const blob = new Blob(["\ufeff" + lignesCsv.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wealthmorand-plan-${NOMS_METHODES[R.methode].toLowerCase().replace(/\s+/g, "-")}-${R.scenario}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Plan de remboursement exporté (CSV).");
  });
  window.addEventListener("beforeprint", () => {
    document.getElementById("impression-info").textContent = `Rapport du ${new Date().toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })} · ${libelleRevenu()} · scénario ${SCENARIOS[R.scenario].toLowerCase()} · méthode ${NOMS_METHODES[R.methode].toLowerCase()}`;
  });

  /* Outils pour le rapport PDF (js/rapport.js). */
  window.Wealthnord = {
    etat: () => S, resultats: () => R, plan: () => planActif === null ? null : principal.plans[planActif].nom,
    verification: () => {
      let total = 0, egaux = 0, pire = 0;
      VERIFICATION.forEach(v => { const b = casCalcul(v); CHAMPS_VERIF.forEach(([k]) => { const e = Math.abs(Math.round(b[k]) - v.officiel[k]); total++; if (e <= 1) egaux++; pire = Math.max(pire, e); }); });
      return { total, egaux, pire, cas: VERIFICATION.length };
    },
    outils: { depensesEffectives, annuelLigne, nomLigne, estPro, ITEMS_PRO, analyseDossier, independance, $, $2, nb, pct, signe, signePct, moisAn, MODES, NOM_MODE, COULEUR_MODE, MILIEUX, ACTIVITES, nomActivite, frequenceTexte, libelleRevenu, SCENARIOS, NOMS_METHODES, CATALOGUE, categorie, mensuel, minimumDette, seriesDettes, jalons, votreP },
  };

  /* Application installable (PWA) : fonctionne hors ligne. */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
    // Nouvelle version publiée pendant que l'app est ouverte : on propose de recharger. On vérifie
    // aussi chaque fois que l'app revient à l'écran (application installée laissée ouverte).
    const avaitVersion = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (avaitVersion) toast("Une nouvelle version de WealthMorand est prête.", () => location.reload(), "Recharger", 20000);
    });
    navigator.serviceWorker.register("sw.js").then(reg => {
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
    }).catch(() => { /* le site fonctionne quand même */ });
  }
  /* Installer l'application : invite du navigateur (Chrome, Edge, Android) ;
     sinon, les étapes selon l'appareil (iPhone, iPad, Mac, Firefox). */
  let invite = null;
  const installee = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const boutonsInstaller = () => document.querySelectorAll("[data-installer]");
  function majInstaller() {
    const deja = installee();
    boutonsInstaller().forEach(b => { b.hidden = deja; });
    document.getElementById("carte-installer").hidden = deja;
  }
  function etapesInstallation() {
    const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua), firefox = /Firefox|FxiOS/.test(ua), safariMac = !ios && /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
    if (ios) return { titre: "Sur iPhone ou iPad", etapes: ["Ouvrez cette page dans Safari.", "Touchez le bouton Partager (le carré avec une flèche vers le haut), en bas de l'écran.", "Faites défiler et touchez « Sur l'écran d'accueil ».", "Touchez « Ajouter » : l'icône WealthMorand apparaît sur votre écran d'accueil."],
      note: "L'application installée garde ses propres données, séparées de Safari : ouvrez-la, puis restaurez votre sauvegarde une fois (Données, Restaurer une sauvegarde)." };
    if (android) return { titre: "Sur Android", etapes: ["Ouvrez cette page dans Chrome.", "Touchez le menu ⋮, en haut à droite.", "Touchez « Installer l'application » ou « Ajouter à l'écran d'accueil ».", "Confirmez : l'icône WealthMorand apparaît avec vos applications."] };
    if (safariMac) return { titre: "Sur Mac, avec Safari", etapes: ["Dans le menu Fichier, choisissez « Ajouter au Dock ».", "Confirmez : WealthMorand s'ouvre dans sa propre fenêtre, depuis le Dock."] };
    if (firefox) return { titre: "Avec Firefox", etapes: ["Firefox n'installe pas les applications web.", "Ouvrez cette page dans Chrome, Edge ou Safari, puis touchez « Installer » de nouveau.", "Ou ajoutez la page à vos favoris : elle fonctionne aussi sans connexion après une première visite."] };
    return { titre: "Sur ordinateur", etapes: ["Dans la barre d'adresse, cliquez sur l'icône d'installation (un écran avec une flèche), à droite.", "Ou ouvrez le menu du navigateur, puis « Installer WealthMorand » (Chrome) ou « Applications », « Installer ce site » (Edge).", "WealthMorand s'ouvre alors dans sa propre fenêtre."] };
  }
  async function installer() {
    if (invite) {
      invite.prompt();
      const choix = await invite.userChoice;
      invite = null;
      if (choix && choix.outcome === "accepted") return;
    }
    const e = etapesInstallation();
    ouvrirFeuille("Installer l'application", c => {
      c.appendChild(el("p", "resume feuille-intro", "WealthMorand s'installe sur l'écran d'accueil comme une vraie application : icône, plein écran, et elle fonctionne sans connexion. Aucun magasin d'applications, aucun compte."));
      const g = el("div", "groupe"); g.appendChild(el("h3", null, e.titre));
      const ol = el("ol", "etapes"); e.etapes.forEach(x => ol.appendChild(el("li", null, x))); g.appendChild(ol); c.appendChild(g);
      if (e.note) c.appendChild(el("p", "aide", e.note));
      c.appendChild(el("p", "aide", "Vos données restent sur l'appareil. Pour les retrouver dans l'application installée ou sur un autre appareil : Données, Exporter une sauvegarde, puis Restaurer une sauvegarde."));
    });
  }
  window.addEventListener("beforeinstallprompt", ev => { ev.preventDefault(); invite = ev; majInstaller(); });
  window.addEventListener("appinstalled", () => { invite = null; majInstaller(); toast("WealthMorand est installée."); });
  boutonsInstaller().forEach(b => b.addEventListener("click", installer));
  majInstaller();

  /* ============================================================
     ASSISTANT DE DÉPART : quelques questions au premier lancement ; l'app part
     ensuite de ces réponses plutôt que d'un exemple. Les tarifs, l'impôt et les
     hypothèses restent ceux de l'exemple ; tout le reste vient des réponses.
     ============================================================ */
  const boiteAssistant = document.getElementById("assistant"), asCorps = document.getElementById("as-corps");
  const asRetour = document.getElementById("as-retour"), asSuivant = document.getElementById("as-suivant");
  const ASSISTANT_VU = "wm.assistant";
  const DESCRIPTION_MILIEU = {
    clinique: "À l'acte, avec les frais de cabinet",
    gmfu: "Taux horaire, mixte ou à l'acte ; enseignement",
    clsc: "Taux horaire, mixte ou à l'acte",
  };
  const TYPES_ASSISTANT = Object.keys(ACTIVITES).filter(k => k !== "autre");
  let A = null, etape = 0;
  const reponsesVides = () => ({ famille: null, depuis12mois: true, enfantCommun: false, partenaire: "salarie", revenuPartenaire: 0,
    enfants: [], milieu: null, demiJournees: 8, srv: 0, premiere: true, incorporee: false,
    ...Object.fromEntries(TYPES_ASSISTANT.flatMap(k => [["act_" + k, false], ["actN_" + k, 4]])),
    logement: null, loyer: 0, maison: 0, hypotheque: 0, tauxHyp: 4.5, paiementHyp: 0, partMaison: 50,
    marge: false, margeSolde: 0, margeTaux: 4.5, pret: false, pretSolde: 0, auto: false, autoSolde: 0, autoPaiement: 0 });
  const enCouple = () => A.famille === "maries" || A.famille === "fait";

  // Morceaux de formulaire : choix illustrés (boutons radio), nombres, cases.
  function asChoix(legende, cle, options) {
    const f = el("fieldset", "as-choix"); f.appendChild(el("legend", null, legende));
    for (const [v, titre, sous] of options) {
      const l = el("label", "as-option"), inp = el("input");
      inp.type = "radio"; inp.name = "as-" + cle; inp.value = v; inp.checked = A[cle] === v;
      inp.addEventListener("change", () => {
        A[cle] = v; rendreEtape();
        const meme = asCorps.querySelector(`input[name="as-${cle}"][value="${v}"]`); if (meme) meme.focus();
      });
      const t = el("span"); t.appendChild(el("strong", null, titre)); if (sous) t.appendChild(el("em", null, sous));
      l.append(inp, t); f.appendChild(l);
    }
    return f;
  }
  const asGroupe = (...champs) => { const g = el("div", "as-groupe"); champs.filter(Boolean).forEach(x => g.appendChild(x)); return g; };
  const asNombre = (l, cle, u, s, h) => creerChamp({ l, u, s, h }, "as-" + cle, inp => {
    inp.value = A[cle] || ""; inp.placeholder = "0";
    inp.addEventListener("input", () => { A[cle] = valeur(inp) ?? 0; });
  }, false);
  const asCase = (l, cle, h, refaire) => creerChamp({ l, t: "check", h }, "as-" + cle, inp => {
    inp.checked = !!A[cle];
    inp.addEventListener("change", () => { A[cle] = inp.checked; if (refaire) { rendreEtape(); document.getElementById("as-" + cle).focus(); } });
  }, false);

  const ETAPES = [
    { titre: "Bienvenue dans WealthMorand", bouton: "Commencer", rendre: c => {
      c.appendChild(el("p", "as-intro", "Quelques questions pour partir de votre situation : votre famille, votre pratique, votre logement et vos dettes. Environ deux minutes. Tout reste sur cet appareil, et tout se modifie ensuite."));
      if (S.meta.exemple) {
        const a = el("div", "actions"), ex = el("button", "bouton secondaire", "Voir un exemple"); ex.type = "button";
        ex.addEventListener("click", () => fermerAssistant()); a.appendChild(ex); c.appendChild(a);
      } else c.appendChild(el("p", "aide", "À la fin, vos valeurs actuelles seront remplacées. Exportez d'abord une sauvegarde (page Données) si vous voulez les garder."));
    } },
    { titre: "Votre situation familiale", valide: () => A.famille ? "" : "Choisissez votre situation familiale.", rendre: c => {
      c.appendChild(asChoix("Vous êtes", "famille", [["seul", "Seul(e)"], ["maries", "En couple : mariés ou union civile"], ["fait", "En couple : conjoints de fait"]]));
      if (A.famille === "fait") c.appendChild(asGroupe(asCase("Vie commune depuis au moins 12 mois", "depuis12mois"),
        asCase("Vous avez un enfant ensemble", "enfantCommun", "Pour l'impôt et les allocations, des conjoints de fait forment un couple après 12 mois de vie commune, ou dès qu'ils ont un enfant ensemble.")));
      if (!enCouple()) return;
      c.appendChild(asChoix("Le travail de votre partenaire", "partenaire", [["salarie", "Salarié(e)"], ["autonome", "À son compte", "Travail autonome, médecin…"], ["sans", "Sans revenu de travail", "Études, maison, congé"]]));
      if (A.partenaire !== "sans") c.appendChild(asGroupe(asNombre(A.partenaire === "salarie" ? "Son salaire brut" : "Son revenu brut d'entreprise", "revenuPartenaire", "$/an", 1000)));
    } },
    { titre: "Vos enfants", rendre: c => {
      const nb$ = creerChamp({ l: "Nombre d'enfants à charge", u: "enfants" }, "as-nbEnfants", inp => {
        inp.value = A.enfants.length; inp.max = 10;
        inp.addEventListener("change", () => {
          const n = Math.min(10, Math.round(valeur(inp) || 0));
          A.enfants = Array.from({ length: n }, (_, i) => A.enfants[i] ?? 0);
          rendreEtape(); document.getElementById("as-nbEnfants").focus();
        });
      }, false);
      const ages = A.enfants.map((age, i) => creerChamp({ l: `Âge de l'enfant ${i + 1}`, u: "ans" }, "as-age-" + i, inp => {
        inp.value = age; inp.max = 25;
        inp.addEventListener("input", () => { A.enfants[i] = Math.min(25, valeur(inp) ?? 0); });
      }, false));
      c.appendChild(asGroupe(nb$, ...ages));
      c.appendChild(el("p", "aide", "Les allocations familiales, l'assurance médicaments et le REEE en dépendent. Pour un enfant de moins d'un an, inscrivez 0."));
    } },
    { titre: "Votre pratique", valide: () => A.milieu ? "" : "Choisissez votre milieu de pratique.", rendre: c => {
      c.appendChild(asChoix("Votre milieu principal", "milieu", Object.entries(MILIEUX).map(([k, m]) => [k, m.long, DESCRIPTION_MILIEU[k]])));
      c.appendChild(asGroupe(asNombre("Demi-journées de rendez-vous par semaine", "demiJournees", "d.-j.", 1),
        asNombre("Demi-journées de sans rendez-vous (SRV)", "srv", "d.-j.", 1),
        asCase("C'est ma première année de pratique", "premiere", "La clientèle se bâtit, et aucun acompte d'impôt n'est exigé la première année."),
        asCase("Ma pratique est incorporée", "incorporee", "Les paiements de la RAMQ sont versés à votre société.")));
    } },
    { titre: "Vos activités en établissement", rendre: c => {
      c.appendChild(el("p", "as-intro", "En plus de votre pratique principale : cochez celles que vous faites."));
      c.appendChild(asGroupe(...TYPES_ASSISTANT.flatMap(k => [
        asCase(ACTIVITES[k].nom, "act_" + k, null, true),
        A["act_" + k] && asNombre(`${ACTIVITES[k].unite === "quart" ? "Quarts" : "Jours"} par mois`, "actN_" + k, "par mois", 0.5),
      ])));
      c.appendChild(el("p", "aide", "Le revenu par jour part d'une valeur indicative. Ensuite, dans la page Revenu, précisez-le et choisissez une autre fréquence au besoin (par semaine, par année, toutes les 6 semaines…)."));
    } },
    { titre: "Votre logement", valide: () => A.logement ? "" : "Choisissez votre logement.", rendre: c => {
      c.appendChild(asChoix("Vous êtes", "logement", [["locataire", "Locataire"], ["proprietaire", "Propriétaire"]]));
      if (A.logement === "locataire") c.appendChild(asGroupe(asNombre("Loyer par mois", "loyer", "$/mois", 50, enCouple() ? "Le loyer complet : il sera partagé selon votre part des dépenses." : null)));
      if (A.logement === "proprietaire") c.appendChild(asGroupe(
        asNombre("Valeur de la maison", "maison", "$", 1000),
        asNombre("Solde de l'hypothèque", "hypotheque", "$", 1000),
        asNombre("Taux de l'hypothèque", "tauxHyp", "%", 0.01),
        asNombre("Paiement par mois", "paiementHyp", "$/mois", 10, "0 : calculé sur 25 ans."),
        enCouple() && asNombre("Votre part de la maison", "partMaison", "%", 1)));
    } },
    { titre: "Vos autres dettes", rendre: c => {
      c.appendChild(asGroupe(
        asCase("Marge de crédit (professionnelle ou étudiante)", "marge", null, true),
        A.marge && asNombre("Solde de la marge", "margeSolde", "$", 1000), A.marge && asNombre("Taux de la marge", "margeTaux", "%", 0.01),
        asCase("Prêt étudiant (aide financière aux études)", "pret", null, true),
        A.pret && asNombre("Solde du prêt étudiant", "pretSolde", "$", 500),
        asCase("Prêt auto", "auto", null, true),
        A.auto && asNombre("Solde du prêt auto", "autoSolde", "$", 500), A.auto && asNombre("Paiement par mois", "autoPaiement", "$/mois", 10)));
      c.appendChild(el("p", "aide", "Vous pourrez ajouter, nommer et préciser chaque dette ensuite (page Budget)."));
    } },
    { titre: "Votre point de départ", bouton: "Créer mon portrait", rendre: c => {
      const couple = enCouple(), n = A.enfants.length;
      const det = [A.marge && `marge de ${$(A.margeSolde)}`, A.pret && `prêt étudiant de ${$(A.pretSolde)}`, A.auto && `prêt auto de ${$(A.autoSolde)}`].filter(Boolean);
      c.appendChild(rangees(el("div"), [
        { titre: "Famille", sous: !couple ? "Seul(e)" : `En couple, ${A.famille === "fait" ? "conjoints de fait" : "mariés ou union civile"} · partenaire ${A.partenaire === "sans" ? "sans revenu de travail" : `${A.partenaire === "salarie" ? "salarié(e)" : "à son compte"}, ${$(A.revenuPartenaire)} par année`}` },
        { titre: "Enfants", sous: n ? `${n} enfant${n > 1 ? "s" : ""} : ${A.enfants.map(a => `${nb(a, 0)} an${a >= 2 ? "s" : ""}`).join(", ")}` : "Aucun" },
        { titre: "Pratique", sous: `${MILIEUX[A.milieu].nom} · ${nb(A.demiJournees)} demi-journées${A.srv ? ` et ${nb(A.srv)} de SRV` : ""} par semaine${A.premiere ? " · première année" : ""}${A.incorporee ? " · incorporée" : ""}` },
        { titre: "Activités en établissement", sous: TYPES_ASSISTANT.filter(k => A["act_" + k] && A["actN_" + k] > 0).map(k => `${ACTIVITES[k].nom} : ${nb(A["actN_" + k])} par mois`).join(" · ") || "Aucune" },
        { titre: "Logement", sous: A.logement === "locataire" ? `Locataire · ${$(A.loyer)} par mois` : `Propriétaire · maison de ${$(A.maison)}${A.hypotheque ? `, hypothèque de ${$(A.hypotheque)}` : ""}` },
        { titre: "Autres dettes", sous: det.length ? det.join(" · ") : "Aucune" },
      ]));
      c.appendChild(el("p", "aide", "Ensuite : entrez vos dépenses du mois (page Budget), puis vérifiez les valeurs de départ du revenu. Les tarifs de la RAMQ, l'impôt 2026 et les hypothèses de l'avenir sont déjà en place."));
    } },
  ];

  function rendreEtape() {
    const e = ETAPES[etape]; asCorps.textContent = "";
    if (etape > 0) asCorps.appendChild(el("p", "as-etape", `Étape ${etape} sur ${ETAPES.length - 1}`));
    const h = el("h2", null, e.titre); h.id = "as-titre"; h.tabIndex = -1; asCorps.appendChild(h);
    e.rendre(asCorps);
    const msg = el("p", "as-message avertissement"); msg.id = "as-message"; msg.setAttribute("role", "alert"); asCorps.appendChild(msg);
    asRetour.hidden = etape === 0; asSuivant.hidden = false; asSuivant.textContent = e.bouton || "Continuer";
    document.querySelectorAll("#as-points li").forEach((li, i) => li.classList.toggle("fait", i < etape));
  }
  function ouvrirAssistant() {
    A = reponsesVides(); etape = 0;
    const pts = document.getElementById("as-points"); pts.textContent = "";
    for (let i = 1; i < ETAPES.length; i++) pts.appendChild(el("li"));
    rendreEtape();
    if (!boiteAssistant.open) boiteAssistant.showModal();
    document.getElementById("as-titre").focus();
  }
  const assistantVu = () => { try { localStorage.setItem(ASSISTANT_VU, "1"); } catch (e) { /* rien à garder */ } };
  function fermerAssistant() { assistantVu(); if (boiteAssistant.open) boiteAssistant.close(); }
  asSuivant.addEventListener("click", () => {
    const e = ETAPES[etape], erreur = e.valide ? e.valide() : "";
    if (erreur) { document.getElementById("as-message").textContent = erreur; return; }
    if (etape === ETAPES.length - 1) return terminerAssistant();
    etape++; rendreEtape(); asCorps.scrollTop = 0; document.getElementById("as-titre").focus();
  });
  asRetour.addEventListener("click", () => { if (etape > 0) { etape--; rendreEtape(); document.getElementById("as-titre").focus(); } });
  document.getElementById("as-fermer").addEventListener("click", fermerAssistant);
  boiteAssistant.addEventListener("close", () => { if (boiteToast.parentNode === boiteAssistant) document.body.appendChild(boiteToast); });
  boiteAssistant.addEventListener("cancel", assistantVu);
  document.getElementById("ap-assistant").addEventListener("click", ouvrirAssistant);
  document.getElementById("reprendre-assistant").addEventListener("click", ouvrirAssistant);

  // Portrait de départ à partir des réponses : rien d'autre ne vient de l'exemple que les
  // tarifs, les paramètres d'impôt et les hypothèses de l'avenir.
  function portraitDepuis(A) {
    const s = normaliser(clone(EXEMPLE)), auj = new Date(), mm = String(auj.getMonth() + 1).padStart(2, "0");
    const couple = A.famille === "maries" || A.famille === "fait", proprio = A.logement === "proprietaire";
    s.meta = { exemple: false, misAJour: null, assistant: auj.toISOString() };
    s.confirmes = {};
    // Pratique
    const dj = Math.min(12, Math.max(0, A.demiJournees || 0)), gmfu = A.milieu === "gmfu";
    Object.assign(s.revenu, { milieu: A.milieu, annee: A.premiere ? "premiere" : "type", modeBudget: A.milieu === "clinique" ? "acte" : "horaire",
      demiJournees: dj, enseignement: gmfu ? Math.min(2, dj) : 0, residents: gmfu ? 1 : 0, demiJourneesSRV: A.srv || 0, patientsSRV: 12,
      semaines: 46, semainesArrivee: 46, autresRevenus: 0,
      activites: TYPES_ASSISTANT.filter(k => A["act_" + k] && A["actN_" + k] > 0).map(k => ({ id: nouvelId("a"), type: k, nom: "", nombre: A["actN_" + k], frequence: "mois", cycle: 6,
        calcul: "jour", parJour: ACTIVITES[k].parJour, patients: ACTIVITES[k].patients, parPatient: ACTIVITES[k].parPatient })) });
    s.impot = { ...s.impot, structure: A.incorporee ? "societe" : "particulier" };
    s.societe = { ...s.societe, solde: 0 };
    // Famille
    Object.assign(s.conjointe, { active: couple, designation: "partenaire", lien: A.famille === "fait" ? "fait" : "maries",
      depuis12mois: !!A.depuis12mois, enfantCommun: !!A.enfantCommun, statut: couple ? A.partenaire : "salarie",
      salaire: couple && A.partenaire === "salarie" ? A.revenuPartenaire : 0, revenuAutonome: couple && A.partenaire === "autonome" ? A.revenuPartenaire : 0,
      rpa: 0, syndicat: 0, depensesAutonome: 0, autresRevenus: 0, medicamentsPublic: A.partenaire !== "salarie",
      partMaison: couple && proprio ? 100 - A.partMaison : 0, epargne: 0, epargneMensuelle: 0, voiture: 0 });
    s.menage = { conjointNetMensuel: 0, allocationsAnnuelles: 0, autresRevenusMensuels: 0, partCommunMoi: couple ? 50 : 100 };
    s.famille = { calculAuto: true, versementA: "moi", medicamentsPublicMoi: true };
    s.epargne = { rendement: 5, encaisse: 0, reer: { solde: 0, droits: 0, cotisationAnnuelle: 0 }, celi: { solde: 0, cotisationAnnuelle: 0 },
      celiapp: { solde: 0, cotisationAnnuelle: 0 }, tauxRetrait: 35,
      reee: { cotisationAnnuelle: 0, enfants: A.enfants.map((age, i) => ({ id: "e" + (i + 1), nom: `Enfant ${i + 1}`, age, solde: 0 })) } };
    // Logement
    const part = proprio ? (couple ? A.partMaison : 100) : 0;
    s.actifs = { logement: proprio ? "proprietaire" : "locataire", maison: { valeur: proprio ? A.maison : 0, part, croissance: 3 },
      voiture: { valeur: 0, depreciation: 15, remplacementAns: 0, prixNeuf: 40000 }, actifsConjoint: 0, autres: [] };
    s.budget = normaliserBudget([]);
    if (!proprio && A.loyer > 0) Object.assign(s.budget.find(b => b.k === "loyer"), { montant: A.loyer, qui: couple ? "commun" : "moi" });
    // Dettes
    const dette = o => ({ id: nouvelId("d"), limite: 0, paiement: 0, frequence: "mois", interetsSeulement: false, finTerme: "", tauxRenouvellement: 0,
      dureeTerme: 5, privilege: 0, creditImpot: 0, partMoi: 100, paiementMoi: 100, ...o });
    s.dettes = [];
    if (proprio && A.hypotheque > 0) {
      const h = dette({ nom: "Hypothèque", type: "hypotheque", solde: A.hypotheque, taux: A.tauxHyp, finTerme: `${auj.getFullYear() + 3}-${mm}-01`,
        tauxRenouvellement: A.tauxHyp, privilege: 15, partMoi: part, paiementMoi: part });
      h.paiement = A.paiementHyp || Math.round(C.paiementPour(A.hypotheque, C.tauxMensuel(h, A.tauxHyp), 300));
      s.dettes.push(h);
    }
    if (A.marge && A.margeSolde > 0) s.dettes.push(dette({ nom: "Marge de crédit", type: "marge", solde: A.margeSolde, taux: A.margeTaux, interetsSeulement: true }));
    if (A.pret && A.pretSolde > 0) s.dettes.push(dette({ nom: "Prêt étudiant (aide financière aux études)", type: "pret", solde: A.pretSolde, taux: 5,
      paiement: Math.round(C.paiementPour(A.pretSolde, 5 / 1200, 120)), creditImpot: 34 }));
    if (A.auto && A.autoSolde > 0) s.dettes.push(dette({ nom: "Prêt auto", type: "pret", solde: A.autoSolde, taux: 6.5, paiement: A.autoPaiement || Math.round(C.paiementPour(A.autoSolde, 6.5 / 1200, 60)) }));
    s.strategie = { ...s.strategie, debut: `${auj.getFullYear()}-${mm}` };
    s.revenu.tarifsModifies = false;
    return synchroniserTarifs(s);
  }
  function terminerAssistant() {
    sortirPlan(true); S = portraitDepuis(A); sauver(); fermerAssistant();
    ouvrir("apercu"); tout();
    toast("Votre portrait est prêt. Précisez maintenant vos revenus et vos dépenses du mois.");
  }

  ouvrir((location.hash || "#apercu").slice(1), true);
  tout();
  document.documentElement.classList.add("pret");
  // Premier lancement : rien d'enregistré et l'assistant jamais vu. Après l'écran d'ouverture, s'il y en a un.
  let dejaVu = true;
  try { dejaVu = !!localStorage.getItem(CLE) || !!localStorage.getItem(ASSISTANT_VU); } catch (e) { /* stockage indisponible */ }
  if (!dejaVu) setTimeout(ouvrirAssistant, document.documentElement.classList.contains("avec-ouverture") ? 1300 : 0);
  if (typeof ResizeObserver !== "undefined") {
    let largeur = document.querySelector("main").clientWidth;
    new ResizeObserver(() => { const w = document.querySelector("main").clientWidth; if (Math.abs(w - largeur) > 4) { largeur = w; if (R) tout(); } }).observe(document.querySelector("main"));
  }
})();
