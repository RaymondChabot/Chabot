/* Wealthnord — interface. L'état vit dans le localStorage de ce navigateur ;
   aucune donnée ne quitte l'appareil. Les calculs sont dans calc.js. */
(function () {
  "use strict";
  const C = window.Calc;
  const CLE = "boussole.v1";
  const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];

  /* ============================================================
     EXEMPLE : valeurs fictives, affichées tant qu'aucun fichier n'est
     importé. Les tarifs RAMQ et les paramètres fiscaux sont réels.
     ============================================================ */
  const EXEMPLE = {
    version: 1,
    meta: { exemple: true, misAJour: null },
    confirmes: {},
    revenu: {
      annee: "premiere", demiJournees: 8, enseignement: 3, heuresParDJ: 4, semaines: 45, patientsParDJ: 6,
      residents: 1, patientsPendantSupervision: 0, autresRevenus: 0,
      inscritsDebut: 200, nouveauxGuichet: 250, nouveauxSansMedecin: 0, nouveauxTransferes: 0,
      semainesArrivee: 45, partVulnerable: 20, quatrePremieresAnnees: true,
      mix: { suivi: 70, suiviV: 15, perioV: 5, pedia: 5, gross: 5 },
      tarifHoraire: 99.48, forfaitHoraireMixte: 59.68, pctMixte: 60, acteSupervision: 114.20, pctSupervision: 60, supervisionMaxH: 3.5,
      perDiemResident: 39.65, forfaitInscription: 10, forfaitVulnerable: 55,
      suppNonVulnerable: 18.90, suppVulnerableHorsGuichet: 58.10, suppVulnerableGuichet: 124.50,
      modeBudget: "horaire",
    },
    impot: { depensesPro: 3000 },
    conjointe: { active: false, salaire: 0, rpa: 0, syndicat: 0, autresRevenus: 0, medicamentsPublic: false, partMaison: 0, epargne: 0, epargneMensuelle: 0, voiture: 0 },
    // Hypothèses de l'avenir. Le scénario réaliste suit les Normes d'hypothèses de
    // projection 2026 (Institut de planification financière et FP Canada).
    scenarios: {
      choisi: "realiste", dollarsAujourdhui: false, horizon: 20,
      prudent: { rendement: 3.5, croissanceMaison: 1.5, depreciationAuto: 20, ecartTaux: 1, inflation: 3, hausseRevenus: 2 },
      realiste: { rendement: 5, croissanceMaison: 3.1, depreciationAuto: 15, ecartTaux: 0, inflation: 2.1, hausseRevenus: 3.1 },
      optimiste: { rendement: 6.5, croissanceMaison: 4.5, depreciationAuto: 12, ecartTaux: -0.5, inflation: 2, hausseRevenus: 3.5 },
    },
    famille: { calculAuto: true, versementA: "moi", medicamentsPublicMoi: true },
    societe: { tauxSociete: 20.5, fraisSociete: 4000 },
    menage: { conjointNetMensuel: 0, allocationsAnnuelles: 2400, autresRevenusMensuels: 0, partCommunMoi: 100 },
    // Valeurs fictives ; les autres cases du catalogue partent à 0.
    budget: [
      { id: "epicerie", k: "epicerie", nom: "", montant: 1300, periode: "mois", qui: "moi" },
      { id: "garderie", k: "garderie", nom: "", montant: 400, periode: "mois", qui: "moi" },
      { id: "taxesMunicipales", k: "taxesMunicipales", nom: "", montant: 4200, periode: "an", qui: "moi" },
      { id: "taxesScolaires", k: "taxesScolaires", nom: "", montant: 500, periode: "an", qui: "moi" },
      { id: "assuranceHabitation", k: "assuranceHabitation", nom: "", montant: 1200, periode: "an", qui: "moi" },
      { id: "electricite", k: "electricite", nom: "", montant: 150, periode: "mois", qui: "moi" },
      { id: "assuranceAuto", k: "assuranceAuto", nom: "", montant: 100, periode: "mois", qui: "moi" },
      { id: "essence", k: "essence", nom: "", montant: 180, periode: "mois", qui: "moi" },
      { id: "cellulaires", k: "cellulaires", nom: "", montant: 100, periode: "mois", qui: "moi" },
      { id: "internet", k: "internet", nom: "", montant: 80, periode: "mois", qui: "moi" },
      { id: "loisirs", k: "loisirs", nom: "", montant: 200, periode: "mois", qui: "moi" },
    ],
    dettes: [
      { id: "d1", nom: "Marge de crédit", type: "marge", solde: 150000, limite: 200000, taux: 4.5, paiement: 0, frequence: "mois", interetsSeulement: true, finTerme: "", tauxRenouvellement: 0, privilege: 0, creditImpot: 0, partMoi: 100, paiementMoi: 100 },
      { id: "d2", nom: "Hypothèque", type: "hypotheque", solde: 300000, limite: 0, taux: 4.0, paiement: 700, frequence: "2sem", interetsSeulement: false, finTerme: "2028-06-01", tauxRenouvellement: 4.0, dureeTerme: 5, privilege: 15, creditImpot: 0, partMoi: 50, paiementMoi: 50 },
      { id: "d3", nom: "Prêt étudiant (aide financière aux études)", type: "pret", solde: 20000, limite: 0, taux: 5.0, paiement: 200, frequence: "mois", interetsSeulement: false, finTerme: "", tauxRenouvellement: 0, privilege: 0, creditImpot: 34, partMoi: 100, paiementMoi: 100 },
    ],
    strategie: { methode: "avalanche", extraMode: "auto", extraManuel: 1000, reerSurDettes: true, debut: "2026-11" },
    epargne: {
      rendement: 5, encaisse: 5000,
      reee: { cotisationAnnuelle: 2500, enfants: [{ id: "e1", nom: "Enfant 1", age: 5, solde: 6000 }, { id: "e2", nom: "Enfant 2", age: 2, solde: 2000 }] },
      reer: { solde: 0, droits: 20000, cotisationAnnuelle: 0 },
      celi: { solde: 0, cotisationAnnuelle: 0 },
    },
    actifs: { maison: { valeur: 500000, part: 50, croissance: 3 }, voiture: { valeur: 15000, depreciation: 15, remplacementAns: 0, prixNeuf: 40000 }, actifsConjoint: 0 },
  };

  /* ============================================================
     CATALOGUE DES DÉPENSES RÉCURRENTES : une case par dépense possible.
     Chaque case garde son montant, sa période et qui la paie ; les
     paiements de dettes et l'épargne viennent de leurs propres sections.
     ============================================================ */
  const CATALOGUE = [
    { cat: "Logement", items: [
      ["taxesMunicipales", "Taxes municipales", "an", "moi"],
      ["taxesScolaires", "Taxe scolaire", "an", "moi"],
      ["assuranceHabitation", "Assurance habitation", "an", "moi"],
      ["electricite", "Électricité", "mois", "moi"],
      ["chauffage", "Chauffage : gaz, mazout ou bois", "mois", "moi"],
      ["eau", "Eau et égouts, si facturés à part", "an", "moi"],
      ["entretienMaison", "Entretien et réparations de la maison", "mois", "moi"],
      ["deneigement", "Déneigement", "an", "moi"],
      ["terrain", "Terrain, piscine, paysagement", "an", "moi"],
      ["alarme", "Système d'alarme", "mois", "moi"],
      ["meubles", "Meubles et électroménagers", "an", "moi"],
    ] },
    { cat: "Alimentation", items: [
      ["epicerie", "Épicerie", "mois", "moi"],
      ["restaurants", "Restaurants et commandes", "mois", "moi"],
      ["lunchs", "Lunchs et cafés au travail", "mois", "moi"],
    ] },
    { cat: "Transport", items: [
      ["assuranceAuto", "Assurance auto", "mois", "moi"],
      ["essence", "Essence ou recharge", "mois", "moi"],
      ["essence2", "Essence ou recharge, 2e véhicule", "mois", "conjoint"],
      ["entretienAuto", "Entretien et pneus", "mois", "moi"],
      ["immatriculation", "Immatriculation et permis de conduire", "an", "moi"],
      ["stationnement", "Stationnement", "mois", "moi"],
      ["transportCommun", "Transport en commun et taxi", "mois", "moi"],
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
    ] },
    { cat: "Santé", items: [
      ["assuranceMedicaments", "Assurance médicaments", "an", "moi"],
      ["medicaments", "Médicaments et pharmacie", "mois", "moi"],
      ["dentiste", "Dentiste", "an", "moi"],
      ["lunettes", "Optométriste et lunettes", "an", "moi"],
      ["therapies", "Physiothérapie, psychologue et autres soins", "an", "moi"],
    ] },
    { cat: "Assurances personnelles", items: [
      ["assuranceInvalidite", "Assurance invalidité", "mois", "moi"],
      ["assuranceVie", "Assurance vie", "mois", "moi"],
      ["maladiesGraves", "Assurance maladies graves", "mois", "moi"],
    ] },
    { cat: "Télécom et abonnements", items: [
      ["cellulaires", "Cellulaires", "mois", "moi"],
      ["internet", "Internet", "mois", "moi"],
      ["television", "Télévision et diffusion en continu", "mois", "moi"],
      ["abonnements", "Autres abonnements : applications, journaux", "mois", "moi"],
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
    ] },
    { cat: "Finances", items: [
      ["fraisBancaires", "Frais bancaires", "mois", "moi"],
      ["comptable", "Comptable et déclarations de revenus", "an", "moi"],
      ["pensionAlimentaire", "Pension alimentaire", "mois", "moi"],
    ] },
    { cat: "Imprévus", items: [
      ["imprevus", "Imprévus", "mois", "moi"],
    ] },
  ];
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
      resultat.push({ id: k, k, nom: "", montant: b ? +b.montant || 0 : 0, periode: b ? b.periode : it.periode, qui: b ? b.qui : it.qui });
    }
    for (const b of budget || []) if (!b.k || !ITEMS.has(b.k)) resultat.push({ id: b.id || nouvelId("b"), k: null, nom: b.nom || "Dépense", montant: +b.montant || 0, periode: b.periode || "mois", qui: b.qui || "commun" });
    return resultat;
  }
  const nomDepense = b => b.k ? ITEMS.get(b.k).nom : b.nom;
  const categorie = b => b.k ? ITEMS.get(b.k).cat : "Autres dépenses";

  /* Résultats de l'outil de calcul du revenu disponible du ministère des Finances du
     Québec (version de mai 2026, revenus d'emploi), relevés le 25 octobre 2026.
     Wealthnord recalcule les mêmes cas à chaque ouverture pour mesurer l'écart. */
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
  function charger() {
    try { const t = localStorage.getItem(CLE); if (t) return fusion(clone(EXEMPLE), JSON.parse(t)); } catch (e) { /* stockage indisponible */ }
    return clone(EXEMPLE);
  }
  let S = charger();
  S.budget = normaliserBudget(S.budget);
  function sauver() {
    S.meta.misAJour = new Date().toISOString();
    try { localStorage.setItem(CLE, JSON.stringify(S)); } catch (e) { /* le calcul fonctionne quand même */ }
  }
  const lire = p => p.split(".").reduce((o, k) => (o == null ? o : o[k]), S);
  const ecrire = (p, v) => { const k = p.split("."); let o = S; for (let i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k[k.length - 1]] = v; };
  const nouvelId = p => p + Math.random().toString(36).slice(2, 8);

  /* ---------- Formats ---------- */
  const fmt$ = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
  const fmt$2 = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const $ = v => fmt$.format(isFinite(v) ? v : 0);
  const $2 = v => fmt$2.format(isFinite(v) ? v : 0);
  const nb = (v, d = 1) => new Intl.NumberFormat("fr-CA", { maximumFractionDigits: d }).format(isFinite(v) ? v : 0);
  const pct = (v, d = 1) => nb(v * 100, d) + " %";
  const signe = v => (v >= 0 ? "+" : "−") + $(Math.abs(v));
  const k$ = v => nb(v / 1000, 0) + " k$";
  const moisAn = d => d ? d.toLocaleDateString("fr-CA", { month: "long", year: "numeric" }) : "jamais";
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };

  /* ============================================================
     CHAMPS : chaque entrée décrit un champ lié à un chemin de l'état
     ============================================================ */
  const CHAMPS = {
    revenu: [
      { g: "Votre semaine" },
      { p: "revenu.demiJournees", l: "Demi-journées par semaine, enseignement inclus", u: "d.-j." },
      { p: "revenu.enseignement", l: "Demi-journées d'enseignement", u: "d.-j." },
      { p: "revenu.heuresParDJ", l: "Heures par demi-journée", u: "h", s: 0.25 },
      { p: "revenu.semaines", l: "Semaines travaillées par année", u: "sem." },
      { p: "revenu.patientsParDJ", l: "Patients vus par demi-journée clinique", u: "pat.", s: 0.5 },
      { p: "revenu.residents", l: "Résidents supervisés en même temps", u: "rés." },
      { p: "revenu.patientsPendantSupervision", l: "Patients vus vous-même pendant la supervision", u: "pat.", s: 0.5, h: "Payés seulement au mode mixte." },
      { p: "revenu.autresRevenus", l: "Autres revenus RAMQ (garde, hospitalisation)", u: "$/an", s: 100 },
      { g: "Votre clientèle" },
      { p: "revenu.annee", l: "Année calculée", t: "select", o: [["premiere", "Première année : arrivée des patients"], ["type", "Année type : clientèle stable"]] },
      { p: "revenu.inscritsDebut", l: "Patients inscrits au départ", u: "pat." },
      { p: "revenu.nouveauxGuichet", l: "Nouveaux patients du guichet d'accès", u: "pat." },
      { p: "revenu.nouveauxSansMedecin", l: "Nouveaux patients sans médecin, hors guichet", u: "pat.", h: "Par exemple, les patients d'un médecin retraité qui a avisé la RAMQ. Ils donnent droit au supplément." },
      { p: "revenu.nouveauxTransferes", l: "Patients transférés, déjà inscrits ailleurs", u: "pat.", h: "Pas de supplément." },
      { p: "revenu.semainesArrivee", l: "Arrivée des nouveaux patients étalée sur", u: "sem." },
      { p: "revenu.partVulnerable", l: "Patients vulnérables", u: "%" },
      { p: "revenu.quatrePremieresAnnees", l: "Dans mes 4 premières années de pratique", t: "check", h: "Après 4 ans, le supplément majoré du guichet ne s'applique qu'à 150 patients par année." },
      { g: "Vos visites, hors prise en charge (%)" },
      { p: "revenu.mix.suivi", l: "Suivis", u: "%" },
      { p: "revenu.mix.suiviV", l: "Suivis de patients vulnérables", u: "%" },
      { p: "revenu.mix.perioV", l: "Visites périodiques de patients vulnérables", u: "%" },
      { p: "revenu.mix.pedia", l: "Visites périodiques pédiatriques", u: "%" },
      { p: "revenu.mix.gross", l: "Suivis de grossesse", u: "%" },
      { g: "Taux horaire (EP 42)" },
      { p: "revenu.tarifHoraire", l: "Tarif horaire", u: "$/h", s: 0.01 },
      { g: "Taux mixte (annexe XXIII)" },
      { p: "revenu.forfaitHoraireMixte", l: "Forfait horaire", u: "$/h", s: 0.01 },
      { p: "revenu.pctMixte", l: "Pourcentage du tarif des visites", u: "%" },
      { p: "revenu.acteSupervision", l: "Acte de supervision, tarif à 100 %", u: "$/h", s: 0.01 },
      { p: "revenu.pctSupervision", l: "Part versée de l'acte de supervision", u: "%" },
      { p: "revenu.supervisionMaxH", l: "Heures de supervision payées au plus", u: "h/d.-j.", s: 0.25 },
      { g: "Payés dans les deux modes" },
      { p: "revenu.perDiemResident", l: "Demi-per diem de supervision, par résident", u: "$", s: 0.01 },
      { p: "revenu.forfaitInscription", l: "Forfait d'inscription générale", u: "$/pat.", s: 0.01 },
      { p: "revenu.forfaitVulnerable", l: "Forfait annuel moyen, patient vulnérable", u: "$/pat.", s: 0.01 },
      { p: "revenu.suppNonVulnerable", l: "Supplément, patient non vulnérable sans médecin", u: "$", s: 0.01 },
      { p: "revenu.suppVulnerableHorsGuichet", l: "Supplément, patient vulnérable hors guichet", u: "$", s: 0.01 },
      { p: "revenu.suppVulnerableGuichet", l: "Supplément, patient vulnérable du guichet", u: "$", s: 0.01 },
      { g: "Pour le budget" },
      { p: "revenu.modeBudget", l: "Mode de rémunération utilisé", t: "select", o: [["horaire", "Taux horaire"], ["mixte", "Taux mixte"]] },
    ],
    impot: [
      { g: "Déductions" },
      { p: "impot.depensesPro", l: "Dépenses professionnelles", u: "$/an", s: 100, h: "Collège des médecins, FMOQ, formation, assurance responsabilité non remboursée." },
      { p: "epargne.reer.cotisationAnnuelle", l: "Cotisation REER de l'année", u: "$/an", s: 100 },
      { g: "Comparaison avec une société" },
      { p: "societe.tauxSociete", l: "Taux d'impôt de la société", u: "%", s: 0.1, h: "9 % fédéral et 11,5 % Québec : une société de médecin a rarement droit à la déduction québécoise des PME." },
      { p: "societe.fraisSociete", l: "Frais annuels de la société", u: "$/an", s: 100, h: "Comptable, déclarations, frais juridiques." },
    ],
    menage: [
      { g: "Revenus du ménage" },
      { p: "menage.autresRevenusMensuels", l: "Autres revenus nets du ménage", u: "$/mois", s: 50 },
      { p: "menage.partCommunMoi", l: "Votre part des dépenses partagées", u: "%", h: "Le reste des dépenses partagées est payé par votre conjointe, ou par quelqu'un d'autre. Sans partage, laissez 100 %." },
      { g: "Conjointe" },
      { p: "conjointe.active", l: "Inclure ma conjointe", t: "check", h: "Ses revenus, son impôt, ses dépenses et sa part de la maison. Vous êtes alors conjoints au sens de l'impôt." },
      { p: "conjointe.salaire", l: "Son salaire brut", u: "$/an", s: 500, si: "conjointe.active" },
      { p: "conjointe.rpa", l: "Ses cotisations au régime de retraite de l'employeur", u: "$/an", s: 100, si: "conjointe.active" },
      { p: "conjointe.syndicat", l: "Ses cotisations syndicales ou professionnelles", u: "$/an", s: 50, si: "conjointe.active" },
      { p: "conjointe.autresRevenus", l: "Ses autres revenus imposables", u: "$/an", s: 100, si: "conjointe.active" },
      { p: "conjointe.medicamentsPublic", l: "Couverte par le régime public d'assurance médicaments", t: "check", si: "conjointe.active", h: "Non si elle a une assurance collective au travail." },
      { p: "conjointe.partMaison", l: "Sa part de propriété de la maison", u: "%", si: "conjointe.active" },
      { p: "conjointe.epargne", l: "Son épargne : REER, CELI, comptes", u: "$", s: 100, si: "conjointe.active" },
      { p: "conjointe.epargneMensuelle", l: "Ce qu'elle épargne chaque mois", u: "$/mois", s: 50, si: "conjointe.active", h: "REER, CELI ou autre ; compté dans la valeur nette du couple et retiré de son surplus." },
      { p: "conjointe.voiture", l: "Valeur de son auto", u: "$", s: 500, si: "conjointe.active" },
      { g: "Famille" },
      { p: "famille.calculAuto", l: "Calculer les allocations familiales selon vos revenus", t: "check", h: "Allocation canadienne pour enfants, Allocation famille et supplément pour fournitures scolaires. Les enfants et leur âge viennent de la page Avenir." },
      { p: "menage.allocationsAnnuelles", l: "Allocations familiales reçues", u: "$/an", s: 50, si: "!famille.calculAuto" },
      { p: "famille.versementA", l: "Allocations versées à", t: "select", o: [["moi", "Moi"], ["conjointe", "Ma conjointe"]], si: "conjointe.active" },
      { p: "famille.medicamentsPublicMoi", l: "Vous êtes couvert par le régime public d'assurance médicaments", t: "check", h: "La prime se paie avec l'impôt du Québec. Non si vous avez une assurance collective." },
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
      { p: "epargne.encaisse", l: "Comptes et encaisse", u: "$", s: 100 },
      { g: "Biens" },
      { p: "actifs.maison.valeur", l: "Valeur de la maison", u: "$", s: 1000 },
      { p: "actifs.maison.part", l: "Votre part de propriété", u: "%" },
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
    ],
  };

  /* ============================================================
     CHAMPS DE SAISIE : ils vivent dans le panneau « Modifier »
     ============================================================ */
  // Un champ : libellé, puis saisie (nombre, liste, mois, date) ou interrupteur.
  function creerChamp(c, id, lier, confirmable) {
    const ligne = el("div", "champ" + (c.t === "check" ? " case" : c.t === "select" || c.t === "month" || c.t === "date" ? " large" : ""));
    if (c.si) ligne.dataset.si = c.si;
    const lab = el("label", null, c.l); lab.htmlFor = id;
    let inp;
    if (c.t === "check") {
      inp = el("input", "interrupteur"); inp.type = "checkbox"; inp.setAttribute("role", "switch");
      ligne.append(lab, inp);
    } else {
      const boite = el("div", "saisie");
      if (c.t === "select") {
        inp = el("select");
        for (const [v, t] of c.o) { const o = el("option", null, t); o.value = v; inp.appendChild(o); }
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
      b.title = "Valeur confirmée par un document"; b.setAttribute("aria-label", "Confirmée : " + c.l);
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
    document.querySelectorAll("[data-si]").forEach(l => {
      const neg = l.dataset.si.startsWith("!"), v = !!lire(l.dataset.si.replace("!", ""));
      l.hidden = neg ? v : !v;
    });
  }
  // Champ d'une liste (dépense, dette, enfant) : lié par data-l, data-i et data-k.
  const lierListe = (liste, i, k) => inp => { inp.dataset.l = liste; inp.dataset.i = i; inp.dataset.k = k; };
  const tableau = nom => nom === "enfants" ? S.epargne.reee.enfants : S[nom];

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
  feuille.addEventListener("close", () => { feuilleCourante = null; corps.textContent = ""; tout(); });
  feuille.addEventListener("click", e => { if (e.target === feuille) feuille.close(); });
  document.getElementById("feuille-fermer").addEventListener("click", () => feuille.close());

  const FEUILLES = {
    revenu: ["Revenu GMF-U", CHAMPS.revenu],
    impot: ["Impôt", CHAMPS.impot],
    menage: ["Ménage et conjointe", CHAMPS.menage],
    strategie: ["Plan de remboursement", CHAMPS.strategie],
    epargne: ["Épargne et biens", CHAMPS.epargne],
    hypotheses: ["Hypothèses de l'avenir", CHAMPS.hypotheses],
  };
  function ouvrirSection(nom) {
    const [titre, champs] = FEUILLES[nom];
    ouvrirFeuille(titre, c => {
      construireChamps(c, champs);
      if (nom !== "revenu") return;
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
  function feuilleCategorie(g) {
    ouvrirFeuille(g, c => {
      const total = el("div", "feuille-total"); c.appendChild(total);
      feuilleCourante.maj = () => {
        const t = S.budget.filter(b => categorie(b) === g).reduce((a, b) => a + mensuel(b), 0);
        total.textContent = ""; total.append(el("span", null, "Total par mois"), el("strong", null, $(t)));
      };
      feuilleCourante.maj();
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
    });
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
    const qui = el("select"); [["moi", "Moi"], ["commun", "Partagée"], ["conjoint", S.conjointe.active ? "Conjointe" : "Autre"]].forEach(([v, t]) => { const o = el("option", null, t); o.value = v; qui.appendChild(o); });
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
  const METHODES = ["avalanche", "hybride", "boule", "minimum"];
  const NOMS_METHODES = { avalanche: "Avalanche", hybride: "Hybride", boule: "Boule de neige", minimum: "Minimums seulement" };
  const AVEC_ARTICLE = { avalanche: "l'avalanche", hybride: "l'hybride", boule: "la boule de neige", minimum: "les minimums" };
  const minimumDette = d => d.interetsSeulement ? d.solde * d.taux / 100 / 12 : (d.frequence === "2sem" ? d.paiement * 26 / 12 : d.paiement);

  function calculer() {
    const R = {};
    R.gmfu = C.revenuGmfu(S.revenu);
    const mode = S.revenu.modeBudget === "mixte" ? "mixte" : "horaire";
    R.mode = mode;
    R.brut = R.gmfu[mode].total;
    R.couple = !!S.conjointe.active;
    R.interetsEtudes = S.dettes.filter(d => d.creditImpot > 0).reduce((a, d) => a + d.solde * d.taux / 100, 0);
    const base = { depensesPro: S.impot.depensesPro, reer: S.epargne.reer.cotisationAnnuelle, interetsEtudes: R.interetsEtudes };
    const salariee = R.couple ? C.impotSalarie({ salaire: S.conjointe.salaire, rpa: S.conjointe.rpa, syndicat: S.conjointe.syndicat, autresRevenus: S.conjointe.autresRevenus }) : null;
    // Conjoints : transferts de crédits, calculés pour chacun des deux modes.
    const avec = r => R.couple ? C.transfertsConjoints(r, salariee) : [r, null];
    const [h, hc] = avec(C.impotParticulier({ ...base, revenu: R.gmfu.horaire.total }));
    const [mx, mc] = avec(C.impotParticulier({ ...base, revenu: R.gmfu.mixte.total }));
    R.impots = { horaire: h, mixte: mx };
    R.impot = R.impots[mode];
    R.conjointe = R.couple ? (mode === "mixte" ? mc : hc) : null;
    R.tauxMarginal = C.tauxMarginal({ ...base, revenu: R.brut });
    // Revenu net d'impôt pour un autre revenu brut (mêmes déductions, mêmes transferts entre conjoints).
    R.netPour = rev => avec(C.impotParticulier({ ...base, revenu: rev }))[0].net;
    const sens = (k, valeurs) => valeurs.map(v => {
      const g = C.revenuGmfu({ ...S.revenu, [k]: v });
      return { v, h: g.horaire.total, m: g.mixte.total, hn: R.netPour(g.horaire.total), mn: R.netPour(g.mixte.total) };
    });
    const dj = S.revenu.demiJournees, pat = S.revenu.patientsParDJ;
    R.sensDJ = sens("demiJournees", [...new Set([4, 5, 6, 7, 8, 9, 10, dj])].filter(n => n >= Math.max(1, S.revenu.enseignement)).sort((a, b) => a - b));
    R.sensPat = sens("patientsParDJ", [...new Set([3, 4, 5, 6, 7, 8, pat])].sort((a, b) => a - b));
    // REER : impôt sans cotisation, et avec une cotisation donnée (au revenu de l'année).
    R.impotSansReer = C.impotParticulier({ ...base, reer: 0, revenu: R.brut }).total;
    R.impotAvecReer = m => C.impotParticulier({ ...base, reer: m, revenu: R.brut }).total;
    R.remboursementReer = S.epargne.reer.cotisationAnnuelle > 0
      ? C.impotParticulier({ ...base, reer: 0, revenu: R.brut }).total - C.impotParticulier({ ...base, revenu: R.brut }).total : 0;

    // Famille : allocations et assurance médicaments, sur le revenu net familial.
    R.ages = S.epargne.reee.enfants.map(x => +x.age).filter(a => a < 18);
    R.netFedFamille = R.impot.revenuNetFed + (R.couple ? R.conjointe.revenuNetFed : 0);
    R.netQcFamille = R.impot.revenuNetQc + (R.couple ? R.conjointe.revenuNetQc : 0);
    R.famille = C.prestationsFamille({ revenuNetFed: R.netFedFamille, revenuNetQc: R.netQcFamille, ages: R.ages, couple: R.couple });
    R.allocations = S.famille.calculAuto ? R.famille.total : S.menage.allocationsAnnuelles;
    const prime = C.primeMedicaments({ revenuNetQc: R.netQcFamille, couple: R.couple, ages: R.ages, adultesCouverts: 1 }).parAdulte;
    R.primeMoi = S.famille.medicamentsPublicMoi ? prime : 0;
    R.primeConjointe = R.couple && S.conjointe.medicamentsPublic ? prime : 0;
    const allocMoi = !R.couple || S.famille.versementA !== "conjointe" ? R.allocations : 0;

    // Budget mensuel
    const part = S.menage.partCommunMoi / 100;
    R.travailMoi = (R.impot.net - S.impot.depensesPro - R.primeMoi) / 12;
    R.allocMoi = allocMoi / 12;
    R.netMoi = R.travailMoi + R.allocMoi;
    R.travailConjointe = R.couple ? (R.conjointe.net - R.primeConjointe) / 12 : 0;
    R.allocConjointe = R.couple ? (R.allocations - allocMoi) / 12 : 0;
    R.netConjointe = R.travailConjointe + R.allocConjointe;
    R.depMoi = 0; R.depConjointe = 0; R.depMenage = 0;
    for (const b of S.budget) {
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
    R.epargneMoi = (enfants * S.epargne.reee.cotisationAnnuelle + S.epargne.reer.cotisationAnnuelle + S.epargne.celi.cotisationAnnuelle) / 12;
    R.surplusMoi = R.netMoi - R.depMoi - R.dettesMoi - R.epargneMoi;
    R.epargneConjointe = R.couple ? S.conjointe.epargneMensuelle || 0 : 0;
    R.surplusConjointe = R.netConjointe - R.depConjointe - R.dettesConjointe - R.epargneConjointe;
    R.revenusMenage = R.netMoi + R.netConjointe + S.menage.autresRevenusMensuels;
    R.surplusMenage = R.revenusMenage - R.depMenage - R.dettesMenage - R.epargneMoi - R.epargneConjointe;

    // Années suivantes : la première année de pratique fait place à une année type
    // (clientèle complète toute l'année), puis les revenus et les dépenses évoluent
    // selon le scénario.
    R.gmfuType = S.revenu.annee === "premiere" ? C.revenuGmfu({ ...S.revenu, annee: "type" }) : R.gmfu;
    const impType = avec(C.impotParticulier({ ...base, revenu: R.gmfuType[mode].total }))[0];
    R.travailMoiType = (impType.net - S.impot.depensesPro - R.primeMoi) / 12;
    R.scenario = SCENARIOS[S.scenarios.choisi] ? S.scenarios.choisi : "realiste";
    R.hyp = S.scenarios[R.scenario];
    // Surplus de l'année a (0 = cette année), qui va sur les dettes.
    const surplusAnnee = h => a => {
      if (S.strategie.extraMode === "manuel") return S.strategie.extraManuel;
      const travail = a === 0 ? R.travailMoi : R.travailMoiType * Math.pow(1 + h.hausseRevenus / 100, a);
      return travail + R.allocMoi - R.depMoi * Math.pow(1 + h.inflation / 100, a) - R.dettesMoi - R.epargneMoi;
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
    const projeter = (h, sim, m = methode) => C.projeterValeurNette({
      annees: ANNEES, anneeDepart: +String(S.strategie.debut).slice(0, 4) || new Date().getFullYear(),
      rendement: h.rendement, reer: S.epargne.reer, celi: S.epargne.celi, encaisse: S.epargne.encaisse,
      maison: { ...S.actifs.maison, croissance: h.croissanceMaison, partMenage: S.actifs.maison.part + (R.couple ? S.conjointe.partMaison : 0) },
      voitures: [{ valeur: S.actifs.voiture.valeur, depreciation: h.depreciationAuto },
        ...(R.couple && S.conjointe.voiture > 0 ? [{ valeur: S.conjointe.voiture, depreciation: h.depreciationAuto, conjointe: true }] : [])],
      actifsConjoint: R.couple ? S.conjointe.epargne : 0, dettes: S.dettes,
      epargneConjointe: R.epargneConjointe, hausseEpargneConjointe: h.hausseRevenus, inflation: h.inflation,
      remplacementAutos: S.actifs.voiture.remplacementAns > 0 ? { ans: S.actifs.voiture.remplacementAns, prix: S.actifs.voiture.prixNeuf } : null,
      ajoutMensuel: m === "minimum" ? surplusAnnee(h) : null,
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
    // Dollars d'aujourd'hui : on retire l'inflation du scénario choisi.
    R.deflateur = a => S.scenarios.dollarsAujourdhui ? Math.pow(1 + R.hyp.inflation / 100, a) : 1;
    R.reee = C.projeterReee({ enfants: S.epargne.reee.enfants, cotisationAnnuelle: S.epargne.reee.cotisationAnnuelle }, R.hyp.rendement / 100);

    // Société : le ménage a besoin de vous de quoi couvrir votre part.
    R.besoinNet = Math.max(0, (R.depMoi + R.dettesMoi + R.extra + (enfants * S.epargne.reee.cotisationAnnuelle + S.epargne.celi.cotisationAnnuelle) / 12) * 12);
    R.societe = C.comparerSociete({ revenu: R.brut, depensesPro: S.impot.depensesPro, fraisSociete: S.societe.fraisSociete,
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
    const tous = series.flatMap(s => s.valeurs).concat(options.bande ? [...options.bande.bas, ...options.bande.haut] : []);
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
  const NOM_MODE = { horaire: "Taux horaire", mixte: "Taux mixte" };
  const choixMode = id => segment(id, [["horaire", "Taux horaire"], ["mixte", "Taux mixte"]], R.mode, v => changer("revenu.modeBudget", v), "Mode de rémunération utilisé");

  function rendreApercu(R) {
    document.getElementById("ap-exemple").hidden = !S.meta.exemple;
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
      tuileLien("revenu", "Revenu brut", $(R.brut), NOM_MODE[R.mode]),
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
    action("important", `Mettez ${pct(R.impot.total / Math.max(1, R.brut), 0)} de chaque paiement de la RAMQ de côté pour l'impôt et les cotisations, environ ${$(R.impot.total / 12)} par mois.`);
    if (S.revenu.annee === "premiere") action("important", `Première année de pratique : aucun acompte n'est exigé, mais environ ${$(R.impot.total)} seront à payer d'un coup le 30 avril.`);
    if (R.couple && !S.conjointe.salaire) action("important", "Inscrivez le salaire brut de votre conjointe (Budget, bouton Ménage) : son impôt, les transferts de crédits, les allocations et la prime d'assurance médicaments en dépendent.");
    if (!S.confirmes["famille.medicamentsPublicMoi"] || (R.couple && !S.confirmes["conjointe.medicamentsPublic"]))
      action("info", `Confirmez qui est couvert par le régime public d'assurance médicaments : la prime, jusqu'à 766 $ par adulte en 2026, est comptée ${R.primeMoi + R.primeConjointe > 0 ? `(${$(R.primeMoi + R.primeConjointe)} cette année)` : "seulement pour une personne sans assurance collective"}.`);
    const auj = new Date(S.strategie.debut + "-01T00:00:00");
    S.dettes.filter(d => d.type === "hypotheque" && d.finTerme).forEach(d => {
      const f = new Date(d.finTerme + "T00:00:00"); const mois = (f - auj) / 2.63e9;
      if (mois >= 0 && mois <= 18) action("info", `Renouvellement de « ${d.nom} » le ${f.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })} : versez un montant forfaitaire sans pénalité si possible, et ne rallongez pas l'amortissement.`);
    });
    S.dettes.filter(d => d.type === "marge" && d.limite > 0).forEach(d => action("info", `Disponible sur « ${d.nom} » : ${$(d.limite - d.solde)}. Gardez cet espace comme fonds d'urgence plutôt que de l'argent qui dort.`));
    if (S.epargne.reee.enfants.filter(e => e.age < 17).length > 0 && S.epargne.reee.cotisationAnnuelle < 2500) action("info", "Cotisez 2 500 $ par enfant par année au REEE pour obtenir toutes les subventions (30 %).");
    if (S.epargne.reer.droits > 0 && S.epargne.reer.cotisationAnnuelle === 0) action("info", `Vous avez ${$(S.epargne.reer.droits)} de droits REER. À votre taux marginal de ${pct(R.tauxMarginal, 0)}, chaque 1 000 $ cotisés vous remet environ ${$(R.tauxMarginal * 1000)}.`);
    if (!S.meta.exemple) {
      const jours = S.meta.dernierExport ? Math.floor((Date.now() - new Date(S.meta.dernierExport)) / 864e5) : Infinity;
      if (jours > 30) action("info", jours === Infinity
        ? "Exportez une copie de vos données (page Données) : elles ne vivent que dans ce navigateur."
        : `Votre dernière copie de sauvegarde date de ${jours} jours : exportez-en une nouvelle (page Données).`);
    }
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
    return l.sort((a, b) => a.t - b.t).slice(0, 8);
  }

  function rendreRevenu(R) {
    const g = R.gmfu, autre = R.mode === "mixte" ? "horaire" : "mixte";
    choixMode("rv-mode");
    const diff = g[R.mode].total - g[autre].total;
    hero("rv-hero", "Revenu brut de l'année", $(g[R.mode].total), [
      `Net après impôt : ${$(R.impots[R.mode].net)}`,
      puce(`${signe(diff)} par rapport au ${NOM_MODE[autre].toLowerCase()}`, diff >= 0 ? "haut" : "bas", diff >= 0),
    ], g[R.mode].total);

    const comp = document.getElementById("rv-comparaison"); comp.textContent = ""; comp.className = "barres";
    const max = Math.max(g.horaire.total, g.mixte.total, 1);
    ["horaire", "mixte"].forEach(k => {
      const b = el("div", "barre-bloc");
      const tete = el("div", "barre-tete");
      const nom = el("span", "barre-nom", NOM_MODE[k]);
      if (R.mode === k) nom.appendChild(el("span", "etiquette-choix", "Utilisé dans le budget"));
      tete.append(nom, el("span", "barre-total", $(g[k].total)));
      const piste = el("div", "barre-piste"); const barre = el("div", "barre");
      const sp = el("span"); sp.style.background = R.mode === k ? "var(--encre)" : "var(--trait)"; barre.appendChild(sp);
      barre.style.width = (g[k].total / max * 100) + "%";
      piste.appendChild(barre);
      b.append(tete, piste, el("div", "aide", `Net après impôt : ${$(R.impots[k].net)}`));
      comp.appendChild(b);
    });
    comp.appendChild(rangees(el("div"), [{ titre: "Écart mixte − horaire", sous: `Après impôt : ${signe(R.impots.mixte.net - R.impots.horaire.net)}`, valeur: signe(g.ecart), cls: "total" }]));
    document.getElementById("rv-seuil").textContent = g.seuilPatients != null
      ? `En clinique, le mixte paie plus que l'horaire au-delà de ${nb(g.seuilPatients)} patients par demi-journée. Vous en voyez ${nb(S.revenu.patientsParDJ)}.`
      : "Sans pourcentage sur les visites, le mixte paie toujours moins en clinique.";

    rendreSensibilite(R);

    const parts = [
      ["Heures ou forfait horaire", x => x.heures ?? x.forfaitHoraire],
      ["Visites (mixte)", x => x.visites || 0],
      ["Acte de supervision (mixte)", x => x.supervision || 0],
      ["Demi-per diem de supervision", x => x.perDiem],
      ["Forfaits d'inscription", x => x.forfaitInscription + x.forfaitVulnerable],
      ["Suppléments sans médecin", x => x.supplements],
      ["Autres revenus", x => x.autres],
    ];
    const zone = document.getElementById("rv-barres"); zone.textContent = ""; zone.className = "barres";
    const maxB = Math.max(g.horaire.total, g.mixte.total, 1);
    ["horaire", "mixte"].forEach(k => {
      const x = g[k], b = el("div", "barre-bloc"), tete = el("div", "barre-tete");
      tete.append(el("span", "barre-nom", NOM_MODE[k]), el("span", "barre-total", $(x.total)));
      const piste = el("div", "barre-piste"), barre = el("div", "barre");
      barre.style.width = (x.total / maxB * 100) + "%";
      parts.forEach(([n, f], i) => { const v = f(x); if (v > 0) { const s = el("span"); s.style.flex = v + " 0 0"; s.style.background = SERIES[i % SERIES.length]; s.title = `${n} : ${$(v)}`; barre.appendChild(s); } });
      piste.appendChild(barre); b.append(tete, piste); zone.appendChild(b);
    });
    const lg = document.getElementById("rv-legende"); lg.textContent = "";
    parts.forEach(([n, f], i) => { if (f(g.horaire) > 0 || f(g.mixte) > 0) { const sp = el("span"); const k = el("i"); k.style.background = SERIES[i % SERIES.length]; sp.append(k, document.createTextNode(n)); lg.appendChild(sp); } });
    lignes(document.getElementById("rv-detail"), ["", "Horaire", "Mixte"], [
      ...parts.filter(([, f]) => f(g.horaire) > 0 || f(g.mixte) > 0).map(([n, f]) => ({ cellules: [n, $(f(g.horaire)), $(f(g.mixte))] })),
      { cls: "total", cellules: ["Total brut", $(g.horaire.total), $(g.mixte.total)] },
    ]);
    rangees("rv-faits", [
      { titre: "Heures travaillées", valeur: nb(g.heures, 0) + " h" },
      { titre: "Visites en clinique", valeur: nb(g.nbVisites, 0) },
      { titre: "Visites de prise en charge", valeur: nb(g.nbPriseEnCharge, 0) },
      { titre: "Patients inscrits", sous: "Du début à la fin de l'année", valeur: `${nb(g.inscritsDepart, 0)} → ${nb(g.inscritsFin, 0)}` },
      { titre: "Semaines au tarif de 500 patients et plus", valeur: `${g.semainesPalierHaut} sur ${S.revenu.semaines}` },
    ]);
  }

  // Selon le nombre de demi-journées et de patients : brut ou net, horaire et mixte.
  function rendreSensibilite(R) {
    segment("rv-sens-vue", [["net", "Net"], ["brut", "Brut"]], U.sensVue, v => { U.sensVue = v; tout(); }, "Montants bruts ou nets");
    const net = U.sensVue === "net", H = x => net ? x.hn : x.h, M = x => net ? x.mn : x.m;
    const dj = S.revenu.demiJournees, pat = S.revenu.patientsParDJ;
    graphiqueLignes(document.getElementById("rv-sens-graph"), document.getElementById("rv-sens-legende"), [
      { nom: "Taux horaire", couleur: SERIES[0], valeurs: R.sensDJ.map(H) },
      { nom: "Taux mixte", couleur: SERIES[1], valeurs: R.sensDJ.map(M) },
    ], R.sensDJ.map(x => String(x.v)), { titre: `Revenu ${net ? "net" : "brut"} selon les demi-journées par semaine`, baseLibre: true, hauteur: 200,
      titreX: i => `${R.sensDJ[i].v} demi-journées par semaine` });
    const ligneSens = (x, actuel, nom) => ({ cls: actuel ? "choisi" : null, cellules: [nom, $(H(x)), $(M(x)), signe(M(x) - H(x))] });
    lignes(document.getElementById("rv-sens-dj"), ["Demi-journées", "Horaire", "Mixte", "Écart"],
      R.sensDJ.map(x => ligneSens(x, x.v === dj, `${x.v}${x.v === dj ? " (vous)" : ""}`)));
    lignes(document.getElementById("rv-sens-pat"), ["Patients", "Horaire", "Mixte", "Écart"],
      R.sensPat.map(x => ligneSens(x, x.v === pat, `${nb(x.v)}${x.v === pat ? " (vous)" : ""}`)));
    document.getElementById("rv-sens-note").textContent = `${net ? "Après impôt et cotisations, avec vos déductions." : "Avant impôt."} L'enseignement reste à ${nb(S.revenu.enseignement)} demi-journée${S.revenu.enseignement > 1 ? "s" : ""} ; les autres demi-journées sont en clinique, à ${nb(pat)} patients chacune. Au taux horaire, le nombre de patients ne change pas le revenu.`;
  }

  function rendreImpot(R) {
    const h = R.impots.horaire, m = R.impots.mixte, t = R.impot.total;
    choixMode("im-mode");
    hero("im-hero", "Impôt et cotisations de l'année", $(t), [
      puce(`Taux moyen ${pct(R.impot.tauxMoyen, 0)}`), puce(`Taux marginal ${pct(R.tauxMarginal, 0)}`),
    ], t);

    // Sur chaque 100 $ gagnés : où va le revenu brut.
    const brut = Math.max(1, R.impot.revenu), cotis = R.impot.rrq + R.impot.rqap + R.impot.fss;
    const dpro = Math.min(S.impot.depensesPro, brut);
    const morceaux = [["Impôt fédéral", R.impot.fed, SERIES[0]], ["Impôt du Québec", R.impot.qc, SERIES[1]], ["RRQ, RQAP et Fonds des services de santé", cotis, SERIES[2]],
      ["Dépenses professionnelles", dpro, SERIES[3]], ["Reste pour vous", R.impot.net - dpro, SERIES[4]]];
    const cent = document.getElementById("im-cent"); cent.textContent = "";
    const barre = el("div", "flux-barre"); barre.setAttribute("role", "img");
    barre.setAttribute("aria-label", morceaux.map(([n, v]) => `${n} ${$2(v / brut * 100)}`).join(", "));
    morceaux.forEach(([n, v, c]) => { if (v > 0) { const sp = el("span"); sp.style.flex = `${v} 0 0`; sp.style.background = c; sp.title = n; barre.appendChild(sp); } });
    cent.appendChild(barre);
    cent.appendChild(rangees(el("div"), morceaux.map(([n, v, c]) => ({ titre: n, couleur: c, valeur: $2(v / brut * 100), valeurSous: $(v) + " par année" }))));

    const a = document.getElementById("im-acomptes"); a.textContent = "";
    a.appendChild(el("p", "resume", `Mettez de côté ${pct(t / Math.max(1, R.brut), 0)} de chaque paiement de la RAMQ, soit environ ${$(t / 12)} par mois. Votre taux marginal de ${pct(R.tauxMarginal, 0)} est ce que coûte chaque dollar de plus, et ce que rapporte chaque dollar cotisé au REER.`));
    const premiere = S.revenu.annee === "premiere";
    const an = (+String(S.strategie.debut).slice(0, 4) || 2026) + 1;
    a.appendChild(rangees(el("div"), premiere
      ? [{ titre: `30 avril ${an}`, sous: "Solde de l'impôt de la première année", valeur: $(t), ico: "!" },
         { titre: `Puis acomptes de ${an}`, sous: "15 mars, 15 juin, 15 septembre et 15 décembre", valeur: $(t / 4), valeurSous: "chacun" }]
      : ["15 mars", "15 juin", "15 septembre", "15 décembre"].map(d => ({ titre: d, sous: "Acompte provisionnel", valeur: $(t / 4) }))));
    a.appendChild(el("p", "aide", premiere
      ? "La première année, l'impôt de l'année précédente (résidence) était faible : aucun acompte n'est exigé. Tout le solde arrive le 30 avril, et les acomptes commencent l'année suivante."
      : "Acomptes trimestriels, calculés sur l'impôt de l'année. Payer les montants que l'Agence du revenu et Revenu Québec vous envoient évite les intérêts."));

    lignes(document.getElementById("im-tableau"), ["", "Horaire", "Mixte"], [
      { cellules: ["Revenu brut", $(h.revenu), $(m.revenu)] },
      { cls: "sous", cellules: ["Revenu imposable", $(h.imposable), $(m.imposable)] },
      { cellules: ["Impôt fédéral", $(h.fed), $(m.fed)] },
      { cellules: ["Impôt du Québec", $(h.qc), $(m.qc)] },
      { cellules: ["RRQ (deux parts)", $(h.rrq), $(m.rrq)] },
      { cellules: ["RQAP", $(h.rqap), $(m.rqap)] },
      { cellules: ["Fonds des services de santé", $(h.fss), $(m.fss)] },
      ...(R.couple && (h.transferts > 0 || m.transferts > 0) ? [{ cellules: ["Crédits transférés par votre conjointe", moins(h.transferts), moins(m.transferts)] }] : []),
      { cls: "total", cellules: ["Net après impôt", $(h.net), $(m.net)] },
      { cls: "sous", cellules: ["Taux moyen", pct(h.tauxMoyen), pct(m.tauxMoyen)] },
    ]);

    rendreFamille(R);
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
      (R.couple ? (S.famille.versementA === "conjointe" ? " Elles sont versées à votre conjointe." : " Elles vous sont versées.") : "")));
    if (S.famille.calculAuto) {
      if (!nEnf) z.appendChild(el("p", "aide", "Ajoutez les enfants et leur âge dans la page Avenir pour calculer les allocations."));
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
      R.couple && { titre: "Prime de votre conjointe", sous: S.conjointe.medicamentsPublic ? "Payée avec l'impôt du Québec" : "Assurance collective : pas de prime", valeur: $(R.primeConjointe) },
    ]));
    z.appendChild(el("p", "aide", "La prime dépend du revenu net familial ; les enfants sont couverts sans prime."));
    if (!R.couple) return;
    const c = R.conjointe;
    z.appendChild(el("h3", null, "Impôt de votre conjointe"));
    z.appendChild(rangees(el("div"), [
      { titre: "Salaire et autres revenus", valeur: $(c.revenu) },
      { titre: "Impôt fédéral", valeur: moins(c.fed) },
      { titre: "Impôt du Québec", valeur: moins(c.qc) },
      { titre: "RRQ, RQAP et assurance-emploi", valeur: moins(c.rrq + c.rqap + c.ae) },
      S.conjointe.rpa + S.conjointe.syndicat > 0 && { titre: "Régime de retraite et cotisations syndicales", valeur: moins(S.conjointe.rpa + S.conjointe.syndicat) },
      c.transferts > 0 && { titre: "Crédits transférés par vous", valeur: $(c.transferts) },
      { titre: "Net après impôt", cls: "total", valeur: $(c.net) },
    ]));
    const recu = R.impot.transferts + c.transferts;
    z.appendChild(el("p", "aide", recu > 0
      ? `Conjoints au sens de l'impôt : ${$(recu)} de crédits non utilisés passent de ${R.impot.transferts > 0 ? "votre conjointe à vous" : "vous à votre conjointe"} (montant pour conjoint au fédéral, transfert de crédits au Québec).`
      : "Conjoints au sens de l'impôt : aucun crédit à transférer, chacun utilise ses propres crédits."));
  }

  // Refait les cas de l'outil officiel avec le calcul de Wealthnord et montre les écarts.
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
    z.append(tete, el("p", "resume", `Wealthnord refait ${VERIFICATION.length} cas de l'outil officiel du ministère des Finances du Québec : ${nb(egaux, 0)} montants sur ${nb(total, 0)} sont identiques, à 1 $ près.` +
      (pire.e ? ` Le plus grand écart est de ${$(Math.abs(pire.e))} (${pire.n.toLowerCase()}, ${pire.cas.charAt(0).toLowerCase() + pire.cas.slice(1)}).` : "")));
    z.appendChild(rangees(el("div"), cas.map(({ v, ecarts }) => {
      const max = ecarts.reduce((m, x) => Math.abs(x.e) > Math.abs(m) ? x.e : m, 0);
      return { titre: nomCas(v), sous: `${ecarts.filter(x => Math.abs(x.e) <= 1).length} sur ${ecarts.length} identiques`, valeur: max ? signe(max) : "Aucun écart" };
    })));
    const d = el("details", "plier"); d.appendChild(el("summary", null, "Voir chaque montant"));
    cas.forEach(({ v, ecarts }) => {
      d.appendChild(el("h4", null, nomCas(v)));
      tableauSimple(d, ["", "Officiel", "Wealthnord", "Écart"], ecarts.map(x => ({ cellules: [x.n, $(x.off), $(x.nous), x.e ? signe(x.e) : "—"] })));
    });
    z.appendChild(d);
    z.appendChild(el("p", "aide", "Outil de calcul du revenu disponible des familles (version de mai 2026, année 2026), consulté le 25 octobre 2026. L'outil ne traite que des revenus d'emploi : il valide les barèmes, les crédits, les transferts entre conjoints, les allocations et la prime d'assurance médicaments. Votre revenu de travailleur autonome (RRQ des deux parts, Fonds des services de santé) suit les mêmes barèmes, mais ne peut pas y être vérifié."));
  }

  function rendreBudget(R) {
    const cj = R.couple;
    if (!cj && U.vueBudget === "conjointe") U.vueBudget = "moi";
    segment("bu-vue", cj ? [["moi", "Vous"], ["conjointe", "Conjointe"], ["menage", "Ménage"]] : [["moi", "Vous"], ["menage", "Ménage"]], U.vueBudget, v => { U.vueBudget = v; tout(); }, "Budget de qui");
    const vue = U.vueBudget, part = S.menage.partCommunMoi / 100;
    const qui = b => vue === "menage" ? 1 : vue === "moi" ? (b.qui === "moi" ? 1 : b.qui === "commun" ? part : 0) : (b.qui === "conjoint" ? 1 : b.qui === "commun" ? 1 - part : 0);
    const partDette = d => vue === "menage" ? 1 : vue === "moi" ? (d.paiementMoi ?? 100) / 100 : 1 - (d.paiementMoi ?? 100) / 100;
    const V = {
      moi: { travail: R.travailMoi, alloc: R.allocMoi, autres: 0, rev: R.netMoi, dep: R.depMoi, dettes: R.dettesMoi, epargne: R.epargneMoi, surplus: R.surplusMoi },
      conjointe: { travail: R.travailConjointe, alloc: R.allocConjointe, autres: 0, rev: R.netConjointe, dep: R.depConjointe, dettes: R.dettesConjointe, epargne: R.epargneConjointe, surplus: R.surplusConjointe },
      menage: { travail: R.travailMoi + R.travailConjointe, alloc: R.allocMoi + R.allocConjointe, autres: S.menage.autresRevenusMensuels, rev: R.revenusMenage, dep: R.depMenage, dettes: R.dettesMenage, epargne: R.epargneMoi + R.epargneConjointe, surplus: R.surplusMenage },
    }[vue];
    const nomVue = { moi: "Votre surplus mensuel", conjointe: "Surplus de votre conjointe", menage: "Surplus du ménage" }[vue];
    hero("bu-hero", nomVue, $(V.surplus), [
      `${$(V.rev)} de revenus, ${$(V.dep + V.dettes + V.epargne)} de sorties`,
      V.surplus < 0 && puce("Budget négatif", "bas", false),
    ], V.surplus);
    rangees("bu-revenus", [
      { titre: "Revenu net de travail", sous: vue === "conjointe" ? "Salaire après impôt et cotisations" : "Après impôt, prime d'assurance médicaments et dépenses pro", valeur: $(V.travail) },
      (R.allocations > 0 || vue !== "conjointe") && { titre: "Allocations familiales", sous: S.famille.calculAuto ? "Calculées selon vos revenus" : "Montant inscrit", valeur: $(V.alloc) },
      V.autres > 0 && { titre: "Autres revenus", valeur: $(V.autres) },
      { titre: "Total", cls: "total", valeur: $(V.rev) },
    ]);
    // Dépenses : une rangée par catégorie ; toucher ouvre ses cases.
    const cats = [...CATALOGUE.map(x => x.cat), "Autres dépenses"];
    rangees("bu-depenses", [
      ...cats.map(g => {
        const l = S.budget.filter(b => categorie(b) === g);
        const n = l.filter(b => b.montant > 0).length;
        const v = l.reduce((s, b) => s + mensuel(b) * qui(b), 0);
        return { titre: g, sous: n ? `${n} dépense${n > 1 ? "s" : ""}` : "Rien d'inscrit", valeur: n ? $(v) : "—", cls: n ? null : "vide", action: () => feuilleCategorie(g) };
      }),
      { titre: vue === "conjointe" ? "Son épargne" : "Épargne : REEE, REER, CELI", sous: vue === "conjointe" ? "Bouton Ménage" : vue === "menage" && R.epargneConjointe ? "La vôtre et celle de votre conjointe" : "Bouton Modifier de la page Avenir", valeur: $(V.epargne) },
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
    document.getElementById("vn-note").textContent = "Chaque paiement d'hypothèque réduit la dette : le capital remboursé devient de l'équité dans la maison, dont la valeur croît chaque année. Une fois les dettes remboursées, le même budget mensuel est placé. Glissez sur le graphique pour voir chaque année." +
      (surplusCopro > 0 && !couple ? ` Vous payez une plus grande part de l'hypothèque que votre part de la maison : le capital que vous remboursez enrichit aussi ${cj ? "votre conjointe" : "l'autre copropriétaire"}, sauf entente écrite ou mariage.` : "");

    // De quoi elle est faite : aujourd'hui, dans 10 ans, dans 20 ans.
    const fin = p.length - 1, cols = [0, Math.round(fin / 2), fin];
    const v = (i, f) => f(p[i]) / def(i);
    const L = couple
      ? [["Maison, part du couple", x => x.maisonMenage], ["Hypothèques", x => -x.hypMenage], ["Équité dans la maison", x => x.equiteMenage, "sous-total"],
         ["Placements : REER, CELI, comptes", x => x.placements + x.conjointe], ["Autos", x => x.voitureMenage], ["Autres dettes", x => -x.autresMenage]]
      : [["Maison, votre part", x => x.maisonMoi], ["Hypothèques, votre part", x => -x.hypMoi], ["Équité dans la maison", x => x.equiteMoi, "sous-total"],
         ["Placements : REER, CELI, comptes", x => x.placements], ["Auto", x => x.voitureMoi], ["Autres dettes, votre part", x => -x.autresMoi]];
    // Sur téléphone, montants abrégés (k$, M$) pour que les trois colonnes tiennent.
    const tableComp = document.getElementById("vn-composition");
    const court = (tableComp.closest(".carte").clientWidth || 600) < 520;
    const m$ = x => !court ? $(x) : Math.abs(x) >= 1e6 ? nb(x / 1e6, 2) + " M$" : nb(x / 1000, Math.abs(x) >= 1e5 ? 0 : 1) + " k$";
    lignes(tableComp, ["", ...cols.map(i => i === 0 ? "Aujourd'hui" : String(p[i].annee))], [
      ...L.map(([n, f, cls]) => ({ cls: cls === "sous-total" ? "choix" : null, cellules: [n, ...cols.map(i => { const x = v(i, f); return Math.abs(x) < 0.5 ? "—" : m$(x); })] })),
      { cls: "total", cellules: ["Valeur nette", ...cols.map(i => m$(v(i, x => x[cle])))] },
    ]);
    document.getElementById("vn-composition-note").textContent = `Valeur de la maison : ${$(p[0].valeurMaison)} aujourd'hui, ${$(p[cols[cols.length - 1]].valeurMaison / def(cols[cols.length - 1]))} en ${p[cols[cols.length - 1]].annee} (${signePct(h.croissanceMaison)} par année).` +
      (S.scenarios.dollarsAujourdhui ? " Montants en dollars d'aujourd'hui." : "");

    rangees("vn-scenarios", Object.entries(SCENARIOS).map(([k, nom]) => {
      const pk = R.projections[k], fin = pk[pk.length - 1], dix = pk[Math.min(10, pk.length - 1)];
      return { titre: nom, ico: k === R.scenario ? "ok" : " ", cls: k === R.scenario ? "choisi" : null,
        sous: R.libres[k] ? `Sans dettes en ${moisAn(R.libres[k])}` : "Dettes jamais remboursées",
        valeur: $(fin[cle] / def(pk.length - 1)), valeurSous: `${dix.annee} : ${$(dix[cle] / def(10))}`,
        action: k === R.scenario ? null : () => changer("scenarios.choisi", k) };
    }));

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
      : `Aucune cotisation REER prévue. À votre taux marginal, 10 000 $ cotisés rapporteraient environ ${$(R.tauxMarginal * 10000)} de remboursement.`));
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
    Object.values(CHAMPS).flat().filter(c => c.p && !S.confirmes[c.p]).filter((c, i, a) => a.findIndex(x => x.p === c.p) === i).forEach(c => l.appendChild(el("li", null, c.l)));
    document.getElementById("donnees-maj").textContent = S.meta.misAJour ? `Dernière modification : ${new Date(S.meta.misAJour).toLocaleString("fr-CA")}` : "";
  }

  let R = null;
  function tout() {
    R = calculer();
    rendreApercu(R); rendreRevenu(R); rendreImpot(R); rendreBudget(R); rendreAvenir(R); rendreFiabilite();
    if (feuilleCourante && feuilleCourante.maj) feuilleCourante.maj();
  }

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
      ecrire(inp.dataset.p, v); S.meta.exemple = false;
      if (inp.dataset.p === "conjointe.active" || inp.dataset.p === "famille.calculAuto") majVisibilite();
      plusTard();
    } else if (inp.dataset.l) {
      const v = valeur(inp); if (v === null) return;
      const item = tableau(inp.dataset.l)[+inp.dataset.i];
      item[inp.dataset.k] = v; S.meta.exemple = false;
      if (inp.dataset.k === "nom" && inp.dataset.l !== "budget" && feuilleCourante) { feuilleCourante.titre = v || "Sans nom"; titreFeuille.textContent = feuilleCourante.titre; }
      if (inp.dataset.l === "budget" && inp.dataset.k === "montant") inp.closest(".ligne-depense").classList.toggle("remplie", v > 0);
      if (inp.dataset.l === "dettes" && (inp.dataset.k === "type" || inp.dataset.k === "interetsSeulement")) { sauver(); reconstruireFeuille(); tout(); return; }
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
      if (nomListe === "budget") { reconstruireFeuille(); tout(); } else feuille.close();
      toast(`« ${retire.nom || "Élément"} » supprimé.`, () => {
        tableau(nomListe).splice(i, 0, retire); sauver();
        if (nomListe === "budget") reconstruireFeuille();
        tout();
      });
    } else if (b.dataset.feuille) ouvrirSection(b.dataset.feuille);
  });

  /* Message en bas de l'écran ; « Annuler » défait la dernière suppression. */
  const boiteToast = document.getElementById("toast");
  let annulerToast = null, minuterieToast = null;
  function toast(texte, annuler) {
    document.getElementById("toast-texte").textContent = texte;
    annulerToast = annuler || null;
    document.getElementById("toast-annuler").hidden = !annuler;
    boiteToast.hidden = false;
    clearTimeout(minuterieToast); minuterieToast = setTimeout(() => { boiteToast.hidden = true; annulerToast = null; }, 6000);
  }
  document.getElementById("toast-annuler").addEventListener("click", () => {
    if (annulerToast) annulerToast();
    annulerToast = null; boiteToast.hidden = true;
  });

  /* Pages, avec la page ouverte dans l'adresse (#revenu, #impot…). */
  const ALIAS = { epargne: "avenir" };
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

  /* Import et export */
  const message = t => { document.getElementById("donnees-message").textContent = t; };
  document.getElementById("exporter").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wealthnord-donnees-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    S.meta.dernierExport = new Date().toISOString(); sauver(); tout();
    message("Fichier exporté. Gardez-le dans un endroit sûr : il contient toutes vos données.");
  });
  document.getElementById("importer").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        const d = JSON.parse(lecteur.result);
        if (!d || d.version !== 1 || !d.revenu || !Array.isArray(d.dettes)) throw new Error("format");
        S = fusion(clone(EXEMPLE), d); S.budget = normaliserBudget(S.budget); S.meta.exemple = false; sauver();
        tout(); message(`Données importées : ${S.dettes.length} dettes, ${S.budget.filter(b => b.montant > 0).length} dépenses inscrites.`);
      } catch (err) { message("Ce fichier n'est pas un fichier de données Wealthnord (ou Boussole). Rien n'a été changé."); }
    };
    lecteur.readAsText(f); e.target.value = "";
  });
  const reinit = document.getElementById("reinitialiser"), confirmer = document.getElementById("confirmer-reinit");
  reinit.addEventListener("click", () => { confirmer.hidden = false; confirmer.focus(); });
  confirmer.addEventListener("click", () => { S = clone(EXEMPLE); S.budget = normaliserBudget(S.budget); sauver(); tout(); confirmer.hidden = true; message("Valeurs d'exemple rétablies."); });

  /* Apparence : automatique (selon l'appareil), claire ou sombre. */
  const lireTheme = () => { try { return localStorage.getItem("wealthnord.theme") || "auto"; } catch (e) { return "auto"; } };
  function appliquerTheme(v) {
    try { if (v === "auto") localStorage.removeItem("wealthnord.theme"); else localStorage.setItem("wealthnord.theme", v); } catch (e) { /* choix non gardé */ }
    if (v === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v;
    // Couleur de la barre du navigateur, assortie au fond.
    const fond = getComputedStyle(document.documentElement).getPropertyValue("--fond").trim();
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => { if (v === "auto") m.setAttribute("content", m.media.includes("dark") ? "#0e0e0d" : "#f5f4f0"); else m.setAttribute("content", fond); });
    segment("theme-choix", [["auto", "Automatique"], ["light", "Clair"], ["dark", "Sombre"]], v, appliquerTheme, "Apparence");
    if (R) tout();
  }
  appliquerTheme(lireTheme());
  document.getElementById("imprimer").addEventListener("click", () => window.print());
  document.getElementById("de-ajout").addEventListener("input", majSimulation);
  window.addEventListener("beforeprint", () => {
    document.getElementById("impression-info").textContent = `Rapport du ${new Date().toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })} · ${NOM_MODE[R.mode].toLowerCase()} · scénario ${SCENARIOS[R.scenario].toLowerCase()} · méthode ${NOMS_METHODES[R.methode].toLowerCase()}`;
  });

  /* Application installable (PWA) : fonctionne hors ligne. */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname)))
    navigator.serviceWorker.register("sw.js").catch(() => { /* le site fonctionne quand même */ });
  let invite = null;
  const boutonInstaller = document.getElementById("installer");
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); invite = e; boutonInstaller.hidden = false; });
  boutonInstaller.addEventListener("click", async () => { if (!invite) return; invite.prompt(); await invite.userChoice; invite = null; boutonInstaller.hidden = true; });
  if (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone) document.getElementById("carte-installer").hidden = true;

  ouvrir((location.hash || "#apercu").slice(1), true);
  tout();
  document.documentElement.classList.add("pret");
  if (typeof ResizeObserver !== "undefined") {
    let largeur = document.querySelector("main").clientWidth;
    new ResizeObserver(() => { const w = document.querySelector("main").clientWidth; if (Math.abs(w - largeur) > 4) { largeur = w; if (R) tout(); } }).observe(document.querySelector("main"));
  }
})();
