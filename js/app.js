/* Boussole — interface. L'état vit dans le localStorage de ce navigateur ;
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
    societe: { tauxSociete: 20.5, fraisSociete: 4000 },
    menage: { conjointNetMensuel: 4000, allocationsAnnuelles: 2400, autresRevenusMensuels: 0, partCommunMoi: 50 },
    budget: [
      { id: "b1", nom: "Épicerie et maison", montant: 1400, periode: "mois", qui: "commun" },
      { id: "b2", nom: "Garderie", montant: 400, periode: "mois", qui: "commun" },
      { id: "b3", nom: "Taxes municipales et scolaires", montant: 5000, periode: "an", qui: "commun" },
      { id: "b4", nom: "Assurance habitation", montant: 1200, periode: "an", qui: "commun" },
      { id: "b5", nom: "Électricité", montant: 150, periode: "mois", qui: "commun" },
      { id: "b6", nom: "Voiture : assurance, essence, entretien", montant: 400, periode: "mois", qui: "moi" },
      { id: "b7", nom: "Assurances invalidité et vie", montant: 300, periode: "mois", qui: "moi" },
      { id: "b8", nom: "Téléphone et internet", montant: 150, periode: "mois", qui: "moi" },
      { id: "b9", nom: "Vêtements, loisirs, imprévus", montant: 700, periode: "mois", qui: "commun" },
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
    actifs: { maison: { valeur: 500000, part: 50, croissance: 3 }, voiture: { valeur: 15000, depreciation: 15 }, actifsConjoint: 0 },
  };

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
      { p: "menage.conjointNetMensuel", l: "Revenu net de l'autre parent", u: "$/mois", s: 50 },
      { p: "menage.allocationsAnnuelles", l: "Allocations familiales, fédérale et Québec", u: "$/an", s: 50 },
      { p: "menage.autresRevenusMensuels", l: "Autres revenus nets", u: "$/mois", s: 50 },
      { p: "menage.partCommunMoi", l: "Votre part des dépenses communes", u: "%" },
    ],
    strategie: [
      { g: "Stratégie de remboursement" },
      { p: "strategie.methode", l: "Méthode", t: "select", o: [["avalanche", "Avalanche : taux réel le plus élevé d'abord"], ["boule", "Boule de neige : plus petit solde d'abord"], ["minimum", "Paiements minimums seulement"]] },
      { p: "strategie.extraMode", l: "Montant en plus chaque mois", t: "select", o: [["auto", "Votre surplus du budget"], ["manuel", "Un montant fixe"]] },
      { p: "strategie.extraManuel", l: "Montant fixe en plus", u: "$/mois", s: 50 },
      { p: "strategie.reerSurDettes", l: "Verser le remboursement d'impôt du REER sur les dettes chaque avril", t: "check" },
      { p: "strategie.debut", l: "Début de la simulation", t: "month" },
    ],
    epargne: [
      { g: "Placements" },
      { p: "epargne.rendement", l: "Rendement annuel attendu", u: "%", s: 0.1 },
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
      { p: "actifs.maison.croissance", l: "Hausse annuelle de la valeur", u: "%", s: 0.1 },
      { p: "actifs.voiture.valeur", l: "Valeur de la voiture", u: "$", s: 100 },
      { p: "actifs.voiture.depreciation", l: "Perte de valeur par année", u: "%" },
      { p: "actifs.actifsConjoint", l: "Épargne de l'autre parent", u: "$", s: 100, h: "Pour la valeur nette du ménage seulement." },
    ],
  };

  function construireChamps(conteneur, champs) {
    conteneur.textContent = "";
    let groupe = null;
    for (const c of champs) {
      if (c.g) {
        groupe = el("div", "groupe");
        groupe.appendChild(el("h3", null, c.g));
        conteneur.appendChild(groupe);
        continue;
      }
      // Un même champ peut paraître dans deux onglets : l'id inclut le conteneur.
      const id = conteneur.id + "-" + c.p.replace(/\./g, "-");
      const ligne = el("div", "champ" + (c.t === "check" ? " case" : c.t === "select" || c.t === "month" ? " large" : ""));
      if (c.t === "check") {
        const inp = el("input"); inp.type = "checkbox"; inp.id = id; inp.dataset.p = c.p;
        const lab = el("label", null, c.l); lab.htmlFor = id;
        ligne.append(inp, lab);
      } else {
        const lab = el("label", null, c.l); lab.htmlFor = id;
        const boite = el("div", "saisie");
        let inp;
        if (c.t === "select") {
          inp = el("select");
          for (const [v, t] of c.o) { const o = el("option", null, t); o.value = v; inp.appendChild(o); }
        } else {
          inp = el("input"); inp.type = c.t === "month" ? "month" : "number";
          if (inp.type === "number") { inp.step = c.s || 1; inp.min = "0"; inp.inputMode = "decimal"; }
        }
        inp.id = id; inp.dataset.p = c.p;
        boite.appendChild(inp);
        if (c.u) boite.appendChild(el("span", "unite", c.u));
        if (c.t === "select" || c.t === "month") { ligne.append(lab); ligne.append(boite); }
        else ligne.append(lab, boite);
      }
      const b = el("button", "conf", "✓"); b.type = "button"; b.dataset.conf = c.p;
      b.title = "Valeur confirmée par un document"; b.setAttribute("aria-label", "Confirmée : " + c.l);
      ligne.appendChild(b);
      if (c.h) ligne.appendChild(el("p", "aide", c.h));
      (groupe || conteneur).appendChild(ligne);
    }
  }
  function remplirChamps() {
    document.querySelectorAll("[data-p]").forEach(inp => {
      const v = lire(inp.dataset.p);
      if (inp.type === "checkbox") inp.checked = !!v; else inp.value = v ?? "";
    });
    document.querySelectorAll("[data-conf]").forEach(b => b.setAttribute("aria-pressed", S.confirmes[b.dataset.conf] ? "true" : "false"));
  }

  /* ---------- Listes : dépenses, dettes, enfants ---------- */
  function listeBudget() {
    const c = document.getElementById("liste-budget"); c.textContent = "";
    c.className = "liste";
    S.budget.forEach((b, i) => {
      const l = el("div", "ligne-budget");
      const nom = el("input"); nom.value = b.nom; nom.setAttribute("aria-label", "Dépense"); nom.dataset.l = "budget"; nom.dataset.i = i; nom.dataset.k = "nom";
      const mnt = el("input"); mnt.type = "number"; mnt.step = "10"; mnt.min = "0"; mnt.inputMode = "decimal"; mnt.value = b.montant; mnt.setAttribute("aria-label", "Montant : " + b.nom); mnt.dataset.l = "budget"; mnt.dataset.i = i; mnt.dataset.k = "montant";
      const per = el("select", "periode"); [["mois", "/ mois"], ["an", "/ an"]].forEach(([v, t]) => { const o = el("option", null, t); o.value = v; per.appendChild(o); });
      per.value = b.periode; per.setAttribute("aria-label", "Période : " + b.nom); per.dataset.l = "budget"; per.dataset.i = i; per.dataset.k = "periode";
      const qui = el("select", "qui"); [["moi", "Moi"], ["commun", "Commun"], ["conjoint", "L'autre parent"]].forEach(([v, t]) => { const o = el("option", null, t); o.value = v; qui.appendChild(o); });
      qui.value = b.qui; qui.setAttribute("aria-label", "Qui paie : " + b.nom); qui.dataset.l = "budget"; qui.dataset.i = i; qui.dataset.k = "qui";
      const x = el("button", "supprimer", "×"); x.type = "button"; x.setAttribute("aria-label", "Supprimer : " + b.nom); x.dataset.suppr = "budget"; x.dataset.i = i;
      l.append(nom, mnt, per, qui, x);
      c.appendChild(l);
    });
  }
  const CHAMPS_DETTE = [
    ["type", "Type", "select", [["marge", "Marge de crédit"], ["hypotheque", "Hypothèque"], ["pret", "Prêt"], ["autre", "Autre"]]],
    ["solde", "Solde ($)", "number", 100],
    ["taux", "Taux (%)", "number", 0.01],
    ["paiement", "Paiement ($)", "number", 0.01],
    ["frequence", "Fréquence", "select", [["mois", "Chaque mois"], ["2sem", "Aux 2 semaines"]]],
    ["limite", "Limite de crédit ($)", "number", 100],
    ["finTerme", "Fin du terme", "date"],
    ["tauxRenouvellement", "Taux au renouvellement (%)", "number", 0.01],
    ["dureeTerme", "Durée des termes suivants (ans)", "number", 1],
    ["privilege", "Remboursement anticipé permis (% par an)", "number", 1],
    ["creditImpot", "Crédit d'impôt sur les intérêts (%)", "number", 1],
    ["partMoi", "Part de la dette qui vous revient (%)", "number", 1],
    ["paiementMoi", "Part des paiements que vous faites (%)", "number", 1],
    ["interetsSeulement", "Intérêts seulement chaque mois", "check"],
  ];
  function listeDettes() {
    const c = document.getElementById("liste-dettes"); c.textContent = ""; c.className = "liste";
    S.dettes.forEach((d, i) => {
      const it = el("div", "item");
      const tete = el("div", "item-tete");
      const nom = el("input"); nom.value = d.nom; nom.setAttribute("aria-label", "Nom de la dette"); nom.dataset.l = "dettes"; nom.dataset.i = i; nom.dataset.k = "nom";
      const x = el("button", "supprimer", "×"); x.type = "button"; x.setAttribute("aria-label", "Supprimer : " + d.nom); x.dataset.suppr = "dettes"; x.dataset.i = i;
      tete.append(nom, x);
      const g = el("div", "item-grille");
      for (const [k, lib, type, extra] of CHAMPS_DETTE) {
        if (k === "limite" && d.type !== "marge") continue;
        if ((k === "finTerme" || k === "tauxRenouvellement" || k === "privilege" || k === "dureeTerme") && d.type !== "hypotheque") continue;
        if (k === "paiement" && d.interetsSeulement) continue;
        if (k === "frequence" && d.interetsSeulement) continue;
        const id = `d-${d.id}-${k}`;
        const lab = el("label", "mini" + (type === "check" ? " case" : ""));
        lab.htmlFor = id;
        let inp;
        if (type === "select") { inp = el("select"); extra.forEach(([v, t]) => { const o = el("option", null, t); o.value = v; inp.appendChild(o); }); inp.value = d[k]; }
        else { inp = el("input"); inp.type = type === "check" ? "checkbox" : type; if (type === "number") { inp.step = extra; inp.min = "0"; inp.inputMode = "decimal"; } if (type === "check") inp.checked = !!d[k]; else inp.value = d[k] ?? ""; }
        inp.id = id; inp.dataset.l = "dettes"; inp.dataset.i = i; inp.dataset.k = k;
        if (type === "check") lab.append(inp, document.createTextNode(lib)); else lab.append(document.createTextNode(lib), inp);
        g.appendChild(lab);
      }
      it.append(tete, g);
      c.appendChild(it);
    });
  }
  function listeEnfants() {
    const c = document.getElementById("liste-enfants"); c.textContent = ""; c.className = "liste";
    S.epargne.reee.enfants.forEach((e, i) => {
      const it = el("div", "item");
      const tete = el("div", "item-tete");
      const nom = el("input"); nom.value = e.nom; nom.setAttribute("aria-label", "Nom ou surnom"); nom.dataset.l = "enfants"; nom.dataset.i = i; nom.dataset.k = "nom";
      const x = el("button", "supprimer", "×"); x.type = "button"; x.setAttribute("aria-label", "Retirer : " + e.nom); x.dataset.suppr = "enfants"; x.dataset.i = i;
      tete.append(nom, x);
      const g = el("div", "item-grille");
      [["age", "Âge", 1], ["solde", "Solde REEE ($)", 100]].forEach(([k, lib, st]) => {
        const id = `e-${e.id}-${k}`;
        const lab = el("label", "mini"); lab.htmlFor = id;
        const inp = el("input"); inp.type = "number"; inp.step = st; inp.min = "0"; inp.inputMode = "decimal"; inp.value = e[k]; inp.id = id;
        inp.dataset.l = "enfants"; inp.dataset.i = i; inp.dataset.k = k;
        lab.append(document.createTextNode(lib), inp); g.appendChild(lab);
      });
      it.append(tete, g); c.appendChild(it);
    });
  }
  const tableau = nom => nom === "enfants" ? S.epargne.reee.enfants : S[nom];

  /* ============================================================
     CALCULS
     ============================================================ */
  const mensuel = b => b.periode === "an" ? b.montant / 12 : b.montant;
  const minimumDette = d => d.interetsSeulement ? d.solde * d.taux / 100 / 12 : (d.frequence === "2sem" ? d.paiement * 26 / 12 : d.paiement);

  function calculer() {
    const R = {};
    R.gmfu = C.revenuGmfu(S.revenu);
    const mode = S.revenu.modeBudget === "mixte" ? "mixte" : "horaire";
    R.mode = mode;
    R.brut = R.gmfu[mode].total;
    R.interetsEtudes = S.dettes.filter(d => d.creditImpot > 0).reduce((a, d) => a + d.solde * d.taux / 100, 0);
    const base = { depensesPro: S.impot.depensesPro, reer: S.epargne.reer.cotisationAnnuelle, interetsEtudes: R.interetsEtudes };
    R.impots = {
      horaire: C.impotParticulier({ ...base, revenu: R.gmfu.horaire.total }),
      mixte: C.impotParticulier({ ...base, revenu: R.gmfu.mixte.total }),
    };
    R.impot = R.impots[mode];
    R.tauxMarginal = C.tauxMarginal({ ...base, revenu: R.brut });
    R.remboursementReer = S.epargne.reer.cotisationAnnuelle > 0
      ? C.impotParticulier({ ...base, reer: 0, revenu: R.brut }).total - R.impot.total : 0;

    // Budget mensuel
    const part = S.menage.partCommunMoi / 100;
    R.netMoi = (R.impot.net - S.impot.depensesPro) / 12;
    R.depMoi = 0; R.depMenage = 0;
    for (const b of S.budget) {
      const m = mensuel(b);
      R.depMenage += m;
      R.depMoi += b.qui === "moi" ? m : b.qui === "commun" ? m * part : 0;
    }
    R.dettesMoi = 0; R.dettesMenage = 0;
    for (const d of S.dettes) {
      const m = minimumDette(d);
      R.dettesMenage += m;
      R.dettesMoi += m * (d.paiementMoi ?? 100) / 100;
    }
    const enfants = S.epargne.reee.enfants.filter(e => e.age < 17).length;
    R.epargneMoi = (enfants * S.epargne.reee.cotisationAnnuelle + S.epargne.reer.cotisationAnnuelle + S.epargne.celi.cotisationAnnuelle) / 12;
    R.surplusMoi = R.netMoi - R.depMoi - R.dettesMoi - R.epargneMoi;
    R.revenusMenage = R.netMoi + S.menage.conjointNetMensuel + S.menage.allocationsAnnuelles / 12 + S.menage.autresRevenusMensuels;
    R.surplusMenage = R.revenusMenage - R.depMenage - R.dettesMenage - R.epargneMoi;

    // Dettes
    R.extra = S.strategie.extraMode === "manuel" ? S.strategie.extraManuel : Math.max(0, R.surplusMoi);
    const forfaits = S.strategie.reerSurDettes ? R.remboursementReer : 0;
    const opt = m => ({ debut: S.strategie.debut, methode: m, extraMensuel: R.extra, forfaitsAnnuels: forfaits, moisForfait: 3 });
    R.sims = {};
    for (const m of ["avalanche", "boule", "minimum"]) R.sims[m] = C.simulerDettes(S.dettes, opt(m));
    R.sim = R.sims[S.strategie.methode] || R.sims.avalanche;
    R.detteTotale = S.dettes.reduce((a, d) => a + d.solde, 0);

    // Valeur nette sur 20 ans
    const budgetDettes = S.strategie.methode === "minimum" ? 0 : R.dettesMoi + R.extra;
    R.projection = C.projeterValeurNette({
      annees: 20, anneeDepart: +String(S.strategie.debut).slice(0, 4) || new Date().getFullYear(),
      rendement: S.epargne.rendement, reer: S.epargne.reer, celi: S.epargne.celi, encaisse: S.epargne.encaisse,
      maison: S.actifs.maison, voiture: S.actifs.voiture, actifsConjoint: S.actifs.actifsConjoint,
      dettes: S.dettes, extraApresDettes: budgetDettes,
    }, R.sim);
    R.reee = C.projeterReee({ enfants: S.epargne.reee.enfants, cotisationAnnuelle: S.epargne.reee.cotisationAnnuelle }, S.epargne.rendement / 100);

    // Société : le ménage a besoin de vous de quoi couvrir votre part.
    R.besoinNet = Math.max(0, (R.depMoi + R.dettesMoi + R.extra + (enfants * S.epargne.reee.cotisationAnnuelle + S.epargne.celi.cotisationAnnuelle) / 12) * 12);
    R.societe = C.comparerSociete({ revenu: R.brut, depensesPro: S.impot.depensesPro, fraisSociete: S.societe.fraisSociete,
      tauxSociete: S.societe.tauxSociete / 100, besoinNet: R.besoinNet });
    return R;
  }

  /* ============================================================
     GRAPHIQUE EN LIGNES, avec réticule et bulle
     ============================================================ */
  function pasJoli(x) {
    if (x <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(x))), n = x / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function graphiqueLignes(boite, legende, series, etiquettesX, options) {
    legende.textContent = "";
    series.forEach(s => { const sp = el("span"); const i = el("i"); i.style.background = s.couleur; sp.append(i, document.createTextNode(s.nom)); legende.appendChild(sp); });
    const W = Math.max(280, boite.clientWidth || 600), H = options.hauteur || 260;
    const m = { l: 56, r: 10, t: 10, b: 28 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b, n = etiquettesX.length;
    let min = Math.min(0, ...series.flatMap(s => s.valeurs)), max = Math.max(1, ...series.flatMap(s => s.valeurs));
    const pas = pasJoli((max - min) / 4);
    min = Math.floor(min / pas) * pas; max = Math.ceil(max / pas) * pas;
    const axe = v => pas < 10000 ? nb(v / 1000, 1) + " k$" : k$(v);
    const x = i => m.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = v => m.t + ih - ((v - min) / (max - min)) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${options.titre}">`;
    for (let v = min; v <= max + 1e-6; v += pas) {
      const yy = Math.round(y(v)) + 0.5;
      s += `<line class="${Math.abs(v) < 1e-6 ? "base" : "grille"}" x1="${m.l}" x2="${W - m.r}" y1="${yy}" y2="${yy}"/>`;
      s += `<text class="etiquette" x="${m.l - 8}" y="${yy}" dy="0.32em" text-anchor="end">${axe(v)}</text>`;
    }
    const chaque = Math.max(1, Math.ceil(n / Math.floor(iw / 48)));
    etiquettesX.forEach((t, i) => { if (i % chaque === 0 || i === n - 1) s += `<text class="etiquette" x="${x(i)}" y="${H - 8}" text-anchor="middle">${t}</text>`; });
    series.forEach(se => {
      const d = se.valeurs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
      s += `<path class="serie" d="${d}" style="stroke:${se.couleur}"/>`;
    });
    s += `<line class="reticule" id="${boite.id}-ret" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>`;
    series.forEach((se, j) => { s += `<circle class="point" r="4" cx="0" cy="0" visibility="hidden" data-j="${j}" style="fill:${se.couleur}"/>`; });
    s += `<rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" tabindex="0" data-zone="1" aria-label="${options.titre} : survolez pour les valeurs"/>`;
    s += "</svg>";
    boite.innerHTML = s;
    const bulle = el("div", "bulle"); bulle.hidden = true; boite.appendChild(bulle);
    const svg = boite.querySelector("svg"), ret = svg.querySelector(".reticule"), points = svg.querySelectorAll(".point"), zone = svg.querySelector("[data-zone]");
    function montrer(i) {
      i = Math.max(0, Math.min(n - 1, i));
      ret.setAttribute("x1", x(i)); ret.setAttribute("x2", x(i)); ret.setAttribute("visibility", "visible");
      points.forEach(p => { const se = series[+p.dataset.j]; p.setAttribute("cx", x(i)); p.setAttribute("cy", y(se.valeurs[i])); p.setAttribute("visibility", "visible"); });
      bulle.textContent = "";
      bulle.appendChild(el("div", "titre", options.titreX ? options.titreX(i) : etiquettesX[i]));
      series.forEach(se => { const r = el("div", "rang"); const k = el("i"); k.style.background = se.couleur; r.append(k, el("strong", null, $(se.valeurs[i])), el("span", null, se.nom)); bulle.appendChild(r); });
      bulle.hidden = false;
      const bw = bulle.offsetWidth;
      let g = x(i) + 12; if (g + bw > W) g = x(i) - bw - 12;
      bulle.style.transform = `translate(${Math.max(0, g)}px, 6px)`;
    }
    const cacher = () => { bulle.hidden = true; ret.setAttribute("visibility", "hidden"); points.forEach(p => p.setAttribute("visibility", "hidden")); };
    let courant = n - 1;
    zone.addEventListener("pointermove", e => { const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width); courant = Math.round(((px - m.l) / iw) * (n - 1)); montrer(courant); });
    zone.addEventListener("pointerleave", cacher);
    zone.addEventListener("focus", () => montrer(courant));
    zone.addEventListener("blur", cacher);
    zone.addEventListener("keydown", e => { if (e.key === "ArrowRight") { courant = Math.min(n - 1, courant + 1); montrer(courant); } if (e.key === "ArrowLeft") { courant = Math.max(0, courant - 1); montrer(courant); } });
  }

  /* ============================================================
     RENDUS
     ============================================================ */
  const tuile = (titre, valeur, sous) => { const t = el("div", "tuile"); t.append(el("div", "tuile-titre", titre), el("div", "tuile-valeur", valeur)); if (sous) t.appendChild(el("div", "tuile-sous", sous)); return t; };
  function lignes(table, entetes, rangees) {
    table.textContent = "";
    if (entetes) { const th = el("thead"); const tr = el("tr"); entetes.forEach(h => tr.appendChild(el("th", null, h))); th.appendChild(tr); table.appendChild(th); }
    const tb = el("tbody");
    rangees.forEach(r => { const tr = el("tr", r.cls || null); r.cellules.forEach((c, i) => { const td = el("td", r.classes && r.classes[i] || null, c); tr.appendChild(td); }); tb.appendChild(tr); });
    table.appendChild(tb);
  }
  // Séries annuelles des soldes de dettes (janvier de chaque année).
  function seriesDettes(sim, cumul) {
    const pts = sim.mois.filter((m, i) => i === 0 || m.date.getMonth() === 0);
    const fin = sim.mois[sim.mois.length - 1];
    if (pts[pts.length - 1] !== fin) pts.push(fin);
    const etiquettes = pts.map(p => String(p.date.getFullYear()));
    if (cumul) return { etiquettes, series: [{ nom: "Total des dettes", couleur: SERIES[0], valeurs: pts.map(p => p.total) }], pts };
    return { etiquettes, series: S.dettes.map((d, j) => ({ nom: d.nom, couleur: SERIES[j % SERIES.length], valeurs: pts.map(p => p.soldes[j]) })), pts };
  }

  function rendreApercu(R) {
    const t = document.getElementById("ap-tuiles"); t.textContent = "";
    const nomMode = R.mode === "mixte" ? "taux mixte" : "taux horaire";
    t.append(
      tuile("Revenu brut de l'année", $(R.brut), `Au ${nomMode}`),
      tuile("Net après impôt", $(R.impot.net), `${$(R.impot.net / 12)} par mois`),
      tuile("Votre surplus mensuel", $(R.surplusMoi), R.surplusMoi >= 0 ? "Après dépenses, dettes et épargne" : "Vos dépenses dépassent vos revenus"),
      tuile("Dettes du ménage", $(R.detteTotale), R.sim.libre ? `Remboursées en ${moisAn(R.sim.libre)}` : "Jamais remboursées à ce rythme"),
      tuile("Votre valeur nette", $(R.projection[0].moi), `Dans 10 ans : ${$(R.projection[Math.min(10, R.projection.length - 1)].moi)}`),
    );
    const a = document.getElementById("ap-actions"); a.textContent = "";
    const action = (type, texte) => { const li = el("li"); li.append(el("span", "ico " + type, type === "important" ? "!" : type === "bon" ? "✓" : "i"), el("span", null, texte)); a.appendChild(li); };
    action("important", `Mettez ${pct(R.impot.total / Math.max(1, R.brut), 0)} de chaque paiement de la RAMQ de côté pour l'impôt et les cotisations, environ ${$(R.impot.total / 12)} par mois.`);
    if (S.revenu.annee === "premiere") action("important", `Première année de pratique : aucun acompte n'est exigé, mais environ ${$(R.impot.total)} seront à payer d'un coup le 30 avril.`);
    const auj = new Date(S.strategie.debut + "-01T00:00:00");
    S.dettes.filter(d => d.type === "hypotheque" && d.finTerme).forEach(d => {
      const f = new Date(d.finTerme + "T00:00:00"); const mois = (f - auj) / 2.63e9;
      if (mois >= 0 && mois <= 18) action("info", `Renouvellement de « ${d.nom} » le ${f.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })} : versez un montant forfaitaire sans pénalité si possible, et ne rallongez pas l'amortissement.`);
    });
    S.dettes.filter(d => d.type === "marge" && d.limite > 0).forEach(d => action("info", `Disponible sur « ${d.nom} » : ${$(d.limite - d.solde)}. Gardez cet espace comme fonds d'urgence plutôt que de l'argent qui dort.`));
    const enfantsSousMax = S.epargne.reee.enfants.filter(e => e.age < 17).length > 0 && S.epargne.reee.cotisationAnnuelle < 2500;
    if (enfantsSousMax) action("info", "Cotisez 2 500 $ par enfant par année au REEE pour obtenir toutes les subventions (30 %).");
    if (S.epargne.reer.droits > 0 && S.epargne.reer.cotisationAnnuelle === 0) action("info", `Vous avez ${$(S.epargne.reer.droits)} de droits REER. À votre taux marginal de ${pct(R.tauxMarginal, 0)}, chaque 1 000 $ cotisés vous remet environ ${$(R.tauxMarginal * 1000)}.`);
    if (R.surplusMoi < 0) action("important", `Votre budget est négatif de ${$(-R.surplusMoi)} par mois : revoyez les dépenses ou leur partage.`);
    else action("bon", `Votre surplus de ${$(R.surplusMoi)} par mois va sur les dettes, dans l'ordre de la méthode choisie.`);
    const sd = seriesDettes(R.sim, false);
    graphiqueLignes(document.getElementById("ap-graph-dettes"), document.getElementById("ap-legende-dettes"), sd.series, sd.etiquettes, { titre: "Soldes des dettes par année" });
  }

  function rendreRevenu(R) {
    const g = R.gmfu;
    const comp = document.getElementById("rv-comparaison"); comp.textContent = "";
    [["horaire", "Taux horaire", SERIES[1]], ["mixte", "Taux mixte", SERIES[0]]].forEach(([k, nom, coul]) => {
      const b = el("div", "mode" + (R.mode === k ? " choisi" : ""));
      const n = el("div", "mode-nom"); const p = el("span", "pastille"); p.style.background = coul; n.append(p, document.createTextNode(nom));
      b.append(n, el("div", "tuile-valeur", $(g[k].total)), el("div", "tuile-sous", `Net après impôt : ${$(R.impots[k].net)}`));
      if (R.mode === k) b.appendChild(el("span", "pill", "Utilisé dans le budget"));
      comp.appendChild(b);
    });
    const ecart = el("div", "mode");
    ecart.append(el("div", "mode-nom", "Écart mixte − horaire"), el("div", "tuile-valeur", signe(g.ecart)), el("div", "tuile-sous", `Après impôt : ${signe(R.impots.mixte.net - R.impots.horaire.net)}`));
    comp.appendChild(ecart);
    document.getElementById("rv-seuil").textContent = g.seuilPatients != null
      ? `En clinique, le mixte paie plus que l'horaire au-delà de ${nb(g.seuilPatients)} patients par demi-journée. Vous en voyez ${nb(S.revenu.patientsParDJ)}.`
      : "Sans pourcentage sur les visites, le mixte paie toujours moins en clinique.";

    const parts = [
      ["Heures ou forfait horaire", x => x.heures ?? x.forfaitHoraire],
      ["Visites (mixte)", x => x.visites || 0],
      ["Acte de supervision (mixte)", x => x.supervision || 0],
      ["Demi-per diem de supervision", x => x.perDiem],
      ["Forfaits d'inscription", x => x.forfaitInscription + x.forfaitVulnerable],
      ["Suppléments sans médecin", x => x.supplements],
      ["Autres revenus", x => x.autres],
    ];
    const lg = document.getElementById("rv-legende"); lg.textContent = "";
    parts.forEach(([n], i) => { const sp = el("span"); const k = el("i"); k.style.cssText = `background:${SERIES[i % SERIES.length]};height:10px;width:10px;border-radius:2px`; sp.append(k, document.createTextNode(n)); lg.appendChild(sp); });
    const zone = document.getElementById("rv-barres"); zone.textContent = "";
    const max = Math.max(g.horaire.total, g.mixte.total);
    [["Horaire", g.horaire], ["Mixte", g.mixte]].forEach(([nom, x]) => {
      const l = el("div", "barre-ligne"); const barre = el("div", "barre");
      barre.style.width = (x.total / max * 100) + "%";
      parts.forEach(([n, f], i) => { const v = f(x); if (v > 0) { const s = el("span"); s.style.flex = v + " 0 0"; s.style.background = SERIES[i % SERIES.length]; s.title = `${n} : ${$(v)}`; barre.appendChild(s); } });
      const conteneur = el("div"); conteneur.appendChild(barre);
      l.append(el("span", "nom", nom), conteneur, el("span", "total", $(x.total)));
      zone.appendChild(l);
    });
    lignes(document.getElementById("rv-detail"), ["", "Horaire", "Mixte"], [
      ...parts.map(([n, f]) => ({ cellules: [n, $(f(g.horaire)), $(f(g.mixte))] })),
      { cls: "total", cellules: ["Total brut", $(g.horaire.total), $(g.mixte.total)] },
    ]);
    const f = document.getElementById("rv-faits"); f.textContent = "";
    [["Heures travaillées", nb(g.heures, 0) + " h"], ["Visites en clinique", nb(g.nbVisites, 0)], ["Visites de prise en charge", nb(g.nbPriseEnCharge, 0)],
     ["Patients inscrits, début → fin", `${nb(g.inscritsDepart, 0)} → ${nb(g.inscritsFin, 0)}`],
     ["Semaines au tarif de 500 patients et plus", `${g.semainesPalierHaut} sur ${S.revenu.semaines}`]]
      .forEach(([dt, dd]) => f.append(el("dt", null, dt), el("dd", null, dd)));
  }

  function rendreImpot(R) {
    const h = R.impots.horaire, m = R.impots.mixte;
    lignes(document.getElementById("im-tableau"), ["", "Taux horaire", "Taux mixte"], [
      { cellules: ["Revenu brut", $(h.revenu), $(m.revenu)] },
      { cls: "sous", cellules: ["Revenu imposable", $(h.imposable), $(m.imposable)] },
      { cellules: ["Impôt fédéral", $(h.fed), $(m.fed)] },
      { cellules: ["Impôt du Québec", $(h.qc), $(m.qc)] },
      { cellules: ["RRQ (deux parts)", $(h.rrq), $(m.rrq)] },
      { cellules: ["RQAP", $(h.rqap), $(m.rqap)] },
      { cellules: ["Fonds des services de santé", $(h.fss), $(m.fss)] },
      { cls: "total", cellules: ["Net après impôt", $(h.net), $(m.net)] },
      { cls: "sous", cellules: ["Taux moyen", pct(h.tauxMoyen), pct(m.tauxMoyen)] },
    ]);
    const a = document.getElementById("im-acomptes"); a.textContent = "";
    const t = R.impot.total;
    a.append(el("p", "resume", `Au ${R.mode === "mixte" ? "taux mixte" : "taux horaire"}, mettez de côté ${pct(t / Math.max(1, R.brut), 0)} de chaque paiement de la RAMQ, soit environ ${$(t / 12)} par mois. Votre taux marginal est de ${pct(R.tauxMarginal, 0)} : c'est ce que coûte en impôt chaque dollar de plus, et ce que rapporte chaque dollar cotisé au REER.`));
    const tb = el("table", "tableau");
    const premiere = S.revenu.annee === "premiere";
    const an = (+String(S.strategie.debut).slice(0, 4) || 2026) + 1;
    lignes(tb, ["Date", "À payer"], premiere
      ? [{ cellules: [`30 avril ${an}`, $(t)] }, { cls: "sous", cellules: [`Ensuite, acomptes du 15 mars, 15 juin, 15 septembre et 15 décembre ${an}`, `${$(t / 4)} chacun`] }]
      : ["15 mars", "15 juin", "15 septembre", "15 décembre"].map(d => ({ cellules: [d, $(t / 4)] })));
    const w = el("div", "tableau-defile"); w.appendChild(tb); a.appendChild(w);
    a.appendChild(el("p", "note", premiere
      ? "La première année, l'impôt de l'année précédente (résidence) était faible : aucun acompte n'est exigé. Tout le solde arrive le 30 avril, et les acomptes commencent l'année suivante."
      : "Acomptes trimestriels, calculés sur l'impôt de l'année. Payer les montants que l'Agence du revenu et Revenu Québec vous envoient évite les intérêts."));

    const s = R.societe, z = document.getElementById("im-societe"); z.textContent = "";
    z.appendChild(el("p", "resume", s.reportAnnuel > 0
      ? `Avec une société, vous paieriez environ ${$(s.reportAnnuel)} de moins cette année, après ${$(S.societe.fraisSociete)} de frais. C'est un report : les ${$(s.societe.retenu)} laissés dans la société seront imposés quand vous les retirerez.`
      : `Une société ne réduirait pas votre impôt cette année : presque tout votre revenu sert au ménage et aux dettes, et les frais (${$(S.societe.fraisSociete)}) dépassent le report possible.`));
    const tb2 = el("table", "tableau");
    lignes(tb2, ["", "Particulier", "Société"], [
      { cellules: ["Besoin net du ménage (votre part, dettes et épargne)", $(R.besoinNet), $(R.besoinNet)] },
      { cellules: ["Impôt de la société", "—", $(s.societe.impotSociete)] },
      { cellules: ["Dividendes versés", "—", $(s.societe.dividendes)] },
      { cellules: ["Impôt personnel et cotisations", $(s.particulier.impot), $(s.societe.impotPerso)] },
      { cellules: ["Frais de la société", "—", $(s.societe.fraisSociete)] },
      { cls: "total", cellules: ["Impôt total cette année", $(s.particulier.impot), $(s.societe.impot + s.societe.fraisSociete)] },
      { cls: "sous", cellules: ["Laissé dans la société", "—", $(s.societe.retenu)] },
    ]);
    const w2 = el("div", "tableau-defile"); w2.appendChild(tb2); z.appendChild(w2);
    z.appendChild(el("p", "note", "Hypothèses : rémunération en dividendes non déterminés seulement, donc pas de RRQ ni de droits REER. Le revenu ne peut pas être fractionné avec l'autre parent sans travail réel dans la société. À valider avec un comptable avant toute décision."));
  }

  function rendreBudget(R) {
    const part = S.menage.partCommunMoi / 100;
    const r = [
      { cellules: ["Votre revenu net (après impôt et dépenses pro)", $(R.netMoi), $(R.netMoi)] },
      { cellules: ["Revenu de l'autre parent, allocations et autres", "—", $(R.revenusMenage - R.netMoi)] },
      { cls: "sous", cellules: ["Revenus", $(R.netMoi), $(R.revenusMenage)] },
      ...S.budget.map(b => ({ cellules: [b.nom, b.qui === "conjoint" ? "—" : $(-(b.qui === "moi" ? mensuel(b) : mensuel(b) * part)), $(-mensuel(b))] })),
      ...S.dettes.map(d => ({ cellules: [`Paiement : ${d.nom}`, $(-minimumDette(d) * (d.paiementMoi ?? 100) / 100), $(-minimumDette(d))] })),
      { cellules: ["Épargne : REEE, REER, CELI", $(-R.epargneMoi), $(-R.epargneMoi)] },
      { cls: "total", cellules: ["Surplus par mois", $(R.surplusMoi), $(R.surplusMenage)], classes: [null, R.surplusMoi >= 0 ? "positif" : "negatif", R.surplusMenage >= 0 ? "positif" : "negatif"] },
    ];
    lignes(document.getElementById("bu-tableau"), ["", "Vous", "Ménage"], r);

    const sim = R.sim;
    const res = document.getElementById("de-resume"); res.textContent = "";
    if (S.strategie.methode === "minimum") res.textContent = sim.libre ? `En payant seulement les minimums, vos dettes sont remboursées en ${moisAn(sim.libre)}.` : "En payant seulement les minimums, la marge de crédit n'est jamais remboursée : ses paiements ne couvrent que les intérêts.";
    else {
      res.append(document.createTextNode(`Avec ${$(R.extra)} de plus par mois${S.strategie.reerSurDettes && R.remboursementReer > 0 ? ` et ${$(R.remboursementReer)} chaque avril (REER)` : ""}, toutes les dettes sont remboursées en `));
      res.appendChild(el("strong", null, moisAn(sim.libre)));
      res.append(document.createTextNode(`, pour ${$(sim.interetsNetsTotaux)} d'intérêts au total, après les crédits d'impôt.`));
    }
    const sd = seriesDettes(sim, false);
    graphiqueLignes(document.getElementById("de-graph"), document.getElementById("de-legende"), sd.series, sd.etiquettes, { titre: "Soldes des dettes par année" });
    lignes(document.getElementById("de-tableau"), ["Dette", "Taux réel", "Remboursée", "Intérêts nets"],
      S.dettes.map((d, j) => ({ cellules: [d.nom, nb(C.tauxReel(d), 2) + " %", moisAn(sim.dettes[j].fin), $(sim.dettes[j].interetsNets)] })));
    const noms = { avalanche: "Avalanche", boule: "Boule de neige", minimum: "Minimums seulement" };
    const av = R.sims.avalanche, bo = R.sims.boule, carte = document.getElementById("de-methodes").closest(".carte");
    let note = carte.querySelector(".note"); if (!note) { note = el("p", "note"); carte.appendChild(note); }
    note.textContent = av.libre && bo.libre && bo.libre < av.libre && av.interetsNetsTotaux <= bo.interetsNetsTotaux
      ? `L'avalanche coûte ${$(bo.interetsNetsTotaux - av.interetsNetsTotaux)} de moins en intérêts, mais la boule de neige finit plus tôt : à la fin de l'avalanche, il ne reste que les hypothèques, dont le remboursement anticipé est limité à ${nb(Math.max(...S.dettes.filter(d => d.type === "hypotheque").map(d => d.privilege || 0)), 0)} % par année. L'argent qui dépasse attend le prochain renouvellement.`
      : "L'avalanche paie d'abord la dette au taux réel le plus élevé : c'est elle qui coûte le moins d'intérêts.";
    lignes(document.getElementById("de-methodes"), ["Méthode", "Sans dettes en", "Intérêts nets au total"],
      ["avalanche", "boule", "minimum"].map(k => ({ cls: k === S.strategie.methode ? "choisi" : null, cellules: [noms[k], moisAn(R.sims[k].libre), R.sims[k].libre ? $(R.sims[k].interetsNetsTotaux) : "—"] })));
  }

  function rendreEpargne(R) {
    const p = R.projection, dix = p[Math.min(10, p.length - 1)], vingt = p[p.length - 1];
    const t = document.getElementById("vn-tuiles"); t.textContent = "";
    t.append(tuile("Aujourd'hui", $(p[0].moi), `Ménage : ${$(p[0].menage)}`), tuile(`En ${dix.annee}`, $(dix.moi), `Ménage : ${$(dix.menage)}`), tuile(`En ${vingt.annee}`, $(vingt.moi), `Ménage : ${$(vingt.menage)}`));
    graphiqueLignes(document.getElementById("vn-graph"), document.getElementById("vn-legende"), [
      { nom: "Votre valeur nette", couleur: SERIES[0], valeurs: p.map(x => x.moi) },
      { nom: "Valeur nette du ménage", couleur: SERIES[1], valeurs: p.map(x => x.menage) },
    ], p.map(x => String(x.annee)), { titre: "Valeur nette projetée" });
    const hyp = S.dettes.filter(d => d.type === "hypotheque");
    const surplusCopro = hyp.reduce((a, d) => a + Math.max(0, ((d.paiementMoi ?? 100) - (d.partMoi ?? 100)) / 100), 0);
    document.getElementById("vn-note").textContent = `Votre valeur nette compte ${nb(S.actifs.maison.part, 0)} % de la maison et la part de chaque dette qui vous revient. Rendement de ${nb(S.epargne.rendement)} % par an ; une fois les dettes remboursées, le même budget mensuel est investi.` +
      (surplusCopro > 0 ? " Vous payez une plus grande part de l'hypothèque que votre part de la maison : le capital que vous remboursez enrichit aussi l'autre copropriétaire, sauf entente écrite ou mariage." : "");
    lignes(document.getElementById("ep-reee"), ["Enfant", "Années restantes", "Vos cotisations", "Subventions", "Valeur à 17 ans"],
      R.reee.map((x, i) => ({ cellules: [S.epargne.reee.enfants[i].nom, String(x.ans), $(x.cotisations), $(x.subventions), $(x.solde)] })));
    const z = document.getElementById("ep-reer"); z.textContent = "";
    const c = S.epargne.reer.cotisationAnnuelle;
    z.appendChild(el("p", "resume", c > 0
      ? `Cotiser ${$(c)} au REER vous rembourse environ ${$(R.remboursementReer)} d'impôt (${pct(R.remboursementReer / c, 0)}).${S.strategie.reerSurDettes ? " Ce remboursement est versé sur vos dettes chaque avril." : ""}`
      : `Aucune cotisation REER prévue. À votre taux marginal, 10 000 $ cotisés rapporteraient environ ${$(R.tauxMarginal * 10000)} de remboursement.`));
    if (S.epargne.reer.droits > 0) z.appendChild(el("p", "note", `Droits inutilisés : ${$(S.epargne.reer.droits)}.`));
  }

  function rendreFiabilite() {
    const tous = Object.values(CHAMPS).flat().filter(c => c.p).map(c => c.p);
    const uniques = [...new Set(tous)];
    const n = uniques.filter(p => S.confirmes[p]).length;
    document.getElementById("fiabilite").textContent = `${n} sur ${uniques.length} valeurs confirmées`;
    const l = document.getElementById("liste-a-confirmer"); l.textContent = "";
    Object.values(CHAMPS).flat().filter(c => c.p && !S.confirmes[c.p]).filter((c, i, a) => a.findIndex(x => x.p === c.p) === i).slice(0, 40).forEach(c => l.appendChild(el("li", null, c.l)));
    document.getElementById("bandeau-exemple").hidden = !S.meta.exemple;
    document.getElementById("donnees-maj").textContent = S.meta.misAJour ? `Dernière modification : ${new Date(S.meta.misAJour).toLocaleString("fr-CA")}` : "";
  }

  let R = null;
  function tout() {
    R = calculer();
    rendreApercu(R); rendreRevenu(R); rendreImpot(R); rendreBudget(R); rendreEpargne(R); rendreFiabilite();
  }

  /* ============================================================
     ÉVÉNEMENTS
     ============================================================ */
  let minuterie = null;
  const plusTard = () => { clearTimeout(minuterie); minuterie = setTimeout(() => { sauver(); tout(); }, 120); };
  function valeur(inp) {
    if (inp.type === "checkbox") return inp.checked;
    if (inp.type === "number") { const v = parseFloat(inp.value); return isFinite(v) ? Math.max(0, v) : null; }
    return inp.value;
  }
  document.addEventListener("input", e => {
    const inp = e.target;
    if (inp.dataset.p) {
      const v = valeur(inp); if (v === null) return;
      ecrire(inp.dataset.p, v); S.meta.exemple = false;
      // Garde à jour la copie du même champ dans un autre onglet.
      document.querySelectorAll(`[data-p="${inp.dataset.p}"]`).forEach(x => { if (x !== inp) { if (x.type === "checkbox") x.checked = !!v; else x.value = v; } });
      plusTard();
    } else if (inp.dataset.l) {
      const v = valeur(inp); if (v === null) return;
      const item = tableau(inp.dataset.l)[+inp.dataset.i];
      item[inp.dataset.k] = v; S.meta.exemple = false;
      if (inp.dataset.l === "dettes" && (inp.dataset.k === "type" || inp.dataset.k === "interetsSeulement")) { sauver(); listeDettes(); tout(); return; }
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
      tableau(b.dataset.suppr).splice(+b.dataset.i, 1); sauver();
      if (b.dataset.suppr === "budget") listeBudget(); else if (b.dataset.suppr === "dettes") listeDettes(); else listeEnfants();
      tout();
    } else if (b.dataset.onglet) ouvrir(b.dataset.onglet);
    else if (b.dataset.aller) ouvrir(b.dataset.aller);
  });
  document.getElementById("ajout-budget").addEventListener("click", () => { S.budget.push({ id: nouvelId("b"), nom: "Nouvelle dépense", montant: 0, periode: "mois", qui: "commun" }); sauver(); listeBudget(); tout(); });
  document.getElementById("ajout-dette").addEventListener("click", () => { S.dettes.push({ id: nouvelId("d"), nom: "Nouvelle dette", type: "pret", solde: 0, limite: 0, taux: 5, paiement: 0, frequence: "mois", interetsSeulement: false, finTerme: "", tauxRenouvellement: 0, dureeTerme: 5, privilege: 0, creditImpot: 0, partMoi: 100, paiementMoi: 100 }); sauver(); listeDettes(); tout(); });
  document.getElementById("ajout-enfant").addEventListener("click", () => { S.epargne.reee.enfants.push({ id: nouvelId("e"), nom: "Enfant", age: 0, solde: 0 }); sauver(); listeEnfants(); tout(); });
  document.getElementById("fiabilite").addEventListener("click", () => ouvrir("donnees"));

  /* Onglets, avec l'onglet ouvert dans l'adresse (#revenu, #impot…). */
  function ouvrir(nom) {
    if (!document.getElementById("v-" + nom)) nom = "apercu";
    document.querySelectorAll("[data-onglet]").forEach(b => b.setAttribute("aria-selected", b.dataset.onglet === nom ? "true" : "false"));
    document.querySelectorAll(".vue").forEach(v => { v.hidden = v.id !== "v-" + nom; });
    if (location.hash !== "#" + nom) history.replaceState(null, "", "#" + nom);
    if (R) tout();   // les graphiques prennent la largeur de l'onglet visible
  }

  /* Import et export */
  const message = t => { document.getElementById("donnees-message").textContent = t; };
  document.getElementById("exporter").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `boussole-donnees-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    message("Fichier exporté. Gardez-le dans un endroit sûr : il contient toutes vos données.");
  });
  document.getElementById("importer").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        const d = JSON.parse(lecteur.result);
        if (!d || d.version !== 1 || !d.revenu || !Array.isArray(d.dettes)) throw new Error("format");
        S = fusion(clone(EXEMPLE), d); S.meta.exemple = false; sauver();
        construireTout(); message(`Données importées : ${S.dettes.length} dettes, ${S.budget.length} dépenses.`);
      } catch (err) { message("Ce fichier n'est pas un fichier de données Boussole. Rien n'a été changé."); }
    };
    lecteur.readAsText(f); e.target.value = "";
  });
  const reinit = document.getElementById("reinitialiser"), confirmer = document.getElementById("confirmer-reinit");
  reinit.addEventListener("click", () => { confirmer.hidden = false; confirmer.focus(); });
  confirmer.addEventListener("click", () => { S = clone(EXEMPLE); sauver(); construireTout(); confirmer.hidden = true; message("Valeurs d'exemple rétablies."); });

  function construireTout() {
    construireChamps(document.getElementById("f-revenu"), CHAMPS.revenu);
    construireChamps(document.getElementById("f-impot"), CHAMPS.impot);
    construireChamps(document.getElementById("f-menage"), CHAMPS.menage);
    construireChamps(document.getElementById("f-strategie"), CHAMPS.strategie);
    construireChamps(document.getElementById("f-epargne"), CHAMPS.epargne);
    listeBudget(); listeDettes(); listeEnfants();
    remplirChamps(); tout();
  }
  construireTout();
  ouvrir((location.hash || "#apercu").slice(1));
  if (typeof ResizeObserver !== "undefined") {
    let largeur = 0;
    new ResizeObserver(() => { const w = document.querySelector("main").clientWidth; if (Math.abs(w - largeur) > 4) { largeur = w; if (R) tout(); } }).observe(document.querySelector("main"));
  }
})();
