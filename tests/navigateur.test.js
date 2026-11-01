/* Tests de bout en bout dans Chromium : node tests/navigateur.test.js
   Démarre un petit serveur local, ouvre l'app et vérifie les parcours principaux.
   Quelques scénarios seulement : SCENARIOS=transfert,residence node tests/navigateur.test.js
   Aucune donnée personnelle : l'exemple de départ et des situations fictives. */
"use strict";
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { chromium } = require("playwright");

const RACINE = path.join(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".json": "application/json" };
function serveur() {
  return new Promise(res => {
    const s = http.createServer((req, rep) => {
      const chemin = decodeURIComponent(req.url.split("?")[0]);
      const f = path.join(RACINE, chemin === "/" ? "index.html" : chemin);
      if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rep.writeHead(404); rep.end(); return; }
      rep.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" });
      fs.createReadStream(f).pipe(rep);
    });
    s.listen(0, "127.0.0.1", () => res(s));
  });
}

let echecs = 0, reussis = 0;
function verifier(nom, condition, detail) {
  if (condition) reussis++;
  else { echecs++; console.error(`ÉCHEC : ${nom}${detail !== undefined ? ` (${JSON.stringify(detail)})` : ""}`); }
}

// Une page neuve, dans son propre contexte (stockage vide) ; l'assistant ne s'ouvre pas tout seul.
async function ouvrir(b, base, { largeur = 390, details = false, sw = false, page = "apercu", horloge = null, avance = true } = {}) {
  const ctx = await b.newContext({ viewport: { width: largeur, height: 844 }, acceptDownloads: true, serviceWorkers: sw ? "allow" : "block" });
  const p = await ctx.newPage(), erreurs = [];
  // HORLOGE=2027-03-15 : toute la suite comme à une autre date (pour trouver les tests qui dépendent du jour).
  if (horloge || process.env.HORLOGE) await p.clock.setFixedTime(new Date(horloge || process.env.HORLOGE + "T10:00:00"));
  p.on("pageerror", e => erreurs.push(String(e)));
  p.on("console", m => { if (m.type() === "error") erreurs.push(m.text()); });
  await ctx.addInitScript(d => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", e => window.__csp.push(e.violatedDirective));
    try { localStorage.setItem("wm.assistant", "1"); sessionStorage.setItem("wm.ouverture", "1"); if (d.details) localStorage.setItem("wm.details", "1");
      if (d.avance && localStorage.getItem("wm.avance") === null) localStorage.setItem("wm.avance", "1"); } catch (e) { /* stockage indisponible */ }
  }, { details, avance });
  await p.goto(`${base}/index.html#${page}`);
  await pret(p);
  return { ctx, p, erreurs };
}
const pret = p => p.waitForFunction(() => window.Wealthnord && window.Wealthnord.resultats());
const resultat = p => p.evaluate(() => { const R = window.Wealthnord.resultats(), S = window.Wealthnord.etat();
  return { brut: Math.round(R.brut), mode: R.mode, milieu: R.milieu, r: S.revenu }; });
// Textes de « À faire », espaces insécables ramenées à des espaces simples.
const aFaire = p => p.evaluate(() => [...document.querySelectorAll("#ap-actions li")].map(l => l.textContent.replace(/\s/g, " ")));
const allerA = async (p, page) => { await p.evaluate(h => { location.hash = "#" + h; }, page); await p.waitForTimeout(250); };
// Remplace l'état enregistré (chemins « revenu.milieu »…), puis recharge l'app.
async function remplacer(p, modifs) {
  await p.evaluate(m => {
    const S = JSON.parse(JSON.stringify(window.Wealthnord.etat()));
    for (const [chemin, v] of Object.entries(m)) { const k = chemin.split("."); let o = S; for (let i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k[k.length - 1]] = v; }
    S.meta.exemple = false;
    localStorage.setItem("boussole.v1", JSON.stringify(S));
  }, modifs);
  await p.reload(); await pret(p);
}

/* 1. Exemple de départ : calcul, pages sans débordement, sans import à l'accueil ni dans l'assistant. */
async function exemple(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base);
  const e = await resultat(p);
  verifier("exemple : revenu calculé, clinique à l'acte", e.brut > 100000 && e.milieu === "clinique" && e.mode === "acte", e.brut);
  verifier("accueil : pas d'import", !(await p.$('#ap-exemple a[href="#donnees"]')) && !/import/i.test(await p.textContent("#ap-exemple")));
  for (const page of ["apercu", "apercu/detail", "revenu", "revenu/detail", "impot", "impot/detail", "budget", "budget/detail", "avenir", "avenir/detail", "donnees"]) {
    await allerA(p, page);
    const d = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    verifier(`page ${page} : pas de défilement horizontal à 390 px`, d <= 0, d);
  }
  verifier("données : restaurer une sauvegarde, un vrai bouton", (await p.textContent("#restaurer-fichier")).includes("Restaurer une sauvegarde"));
  await allerA(p, "apercu");
  await p.click("#ap-assistant"); await p.waitForTimeout(300);
  verifier("assistant : pas d'import", !(await p.evaluate(() => [...document.querySelectorAll("#assistant label, #assistant button")].some(x => /import/i.test(x.textContent)))));
  verifier("sécurité du contenu : aucune violation", (await p.evaluate(() => window.__csp.length)) === 0, await p.evaluate(() => window.__csp));
  verifier("exemple : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 2. Montants de la Brochure no 1 : ils suivent la colonne et la liste ; une valeur modifiée reste ; « Rétablir ». */
async function brochure(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { details: true, page: "revenu/detail" });
  let r = (await resultat(p)).r;
  verifier("exemple : colonne cabinet", r.forfaitInscription === 11.85 && r.suppVulnerableGuichet === 155.35 && r.perDiemResident === 55.35 && r.pctMixte === 63.58, r);
  await p.selectOption("#rv-milieu", "gmfu"); await p.waitForTimeout(300);
  r = (await resultat(p)).r;
  verifier("GMF-U : colonne établissement", r.forfaitInscription === 8.95 && r.forfaitVulnerable === 47 && r.perDiemResident === 41.45 && r.perDiemExterne === 49.85, r);
  await p.click('[data-feuille="revenu"]'); await p.waitForTimeout(400);
  await p.selectOption("#c-revenu-listeEnseignement", "2"); await p.waitForTimeout(200);
  r = (await resultat(p)).r;
  verifier("liste 2 : 65,20 $ et 73,55 $", r.perDiemResident === 65.2 && r.perDiemExterne === 73.55, r);
  await p.selectOption("#c-revenu-lieuTarifs", "cabinet"); await p.waitForTimeout(200);
  await p.fill("#c-revenu-forfaitInscription", "12"); await p.waitForTimeout(200);
  await p.selectOption("#c-revenu-lieuTarifs", "etablissement"); await p.waitForTimeout(200);
  r = (await resultat(p)).r;
  verifier("valeur modifiée gardée, les autres suivent la colonne", r.forfaitInscription === 12 && r.perDiemResident === 65.2 && r.forfaitVulnerable === 47, r);
  await p.click("text=Rétablir les tarifs de la RAMQ"); await p.waitForTimeout(300);
  r = (await resultat(p)).r;
  verifier("Rétablir : montants de la brochure", r.forfaitInscription === 8.95 && r.pctMixte === 63.58, r);
  verifier("brochure : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 3. Alertes de la RAMQ et forfait GMF, dans une situation fictive en GMF-U au taux horaire. */
async function alertes(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { details: true });
  await remplacer(p, { "revenu.milieu": "gmfu", "revenu.modeBudget": "horaire", "revenu.annee": "type", "revenu.demiJournees": 10, "revenu.enseignement": 2,
    "revenu.residents": 1, "revenu.semaines": 45, "revenu.patientsParDJ": 6, "revenu.demiJourneesSRV": 0, "revenu.activites": [], "revenu.inscritsDebut": 680,
    "revenu.nouveauxGuichet": 0, "revenu.membreGmf": false });
  const l = await aFaire(p), avant = await resultat(p);
  verifier("alerte : heures au-delà de 1 540 h", l.some(t => t.includes("au-delà de 1 540 h")), l);
  verifier("alerte : 7 500 $ à 750 inscrits", l.some(t => t.includes("7 500 $")), l);
  verifier("alerte : forfait GMF", l.some(t => t.includes("Un GMF-U est un GMF")), l);
  await allerA(p, "revenu");
  await p.click('[data-feuille="revenu"]'); await p.waitForTimeout(400);
  await p.check("#c-revenu-membreGmf"); await p.waitForTimeout(300);
  await p.click("#feuille-fermer"); await p.waitForTimeout(400);
  await allerA(p, "apercu");
  const apres = await resultat(p);
  verifier("forfait GMF : 9,35 $ × 680 × 80 %", Math.abs(apres.brut - avant.brut - 680 * 0.8 * 9.35) <= 1, apres.brut - avant.brut);
  verifier("forfait GMF : l'alerte disparaît une fois la case touchée", !(await aFaire(p)).some(t => t.includes("Un GMF-U est un GMF")));
  verifier("alertes : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 4. Sauvegarde et restauration : le fichier exporté redonne les mêmes chiffres sur un appareil neuf. */
async function sauvegarde(b, base) {
  const a = await ouvrir(b, base, { page: "donnees" });
  await remplacer(a.p, { "revenu.semaines": 40, "revenu.patientsParDJ": 7 });
  const attendu = (await resultat(a.p)).brut;
  const [dl] = await Promise.all([a.p.waitForEvent("download"), a.p.click("#exporter")]);
  const fichier = path.join(os.tmpdir(), `wm-test-${process.pid}.json`);
  await dl.saveAs(fichier);
  await a.ctx.close();
  const n = await ouvrir(b, base, { page: "donnees" });
  await n.p.setInputFiles("#importer", fichier); await n.p.waitForSelector("#feuille-corps .bouton.danger", { timeout: 10000 });
  verifier("restauration : rien ne change avant le bouton", await n.p.evaluate(() => window.Wealthnord.etat().meta.exemple === true && document.getElementById("feuille-titre").textContent === "Restaurer une sauvegarde"));
  await n.p.click("#feuille-corps .bouton.danger"); await n.p.waitForTimeout(400);
  verifier("restauration : message", (await n.p.textContent("#donnees-message")).startsWith("Sauvegarde restaurée"));
  verifier("restauration : mêmes chiffres", (await resultat(n.p)).brut === attendu, [(await resultat(n.p)).brut, attendu]);
  fs.unlinkSync(fichier);
  verifier("sauvegarde : aucune erreur", a.erreurs.length + n.erreurs.length === 0, [...a.erreurs, ...n.erreurs]);
  await n.ctx.close();
}

/* 5. Démarrage robuste : des lignes sans identifiant (ancien fichier) n'empêchent pas l'app de démarrer. */
async function robustesse(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base);
  await p.evaluate(() => {
    const S = JSON.parse(JSON.stringify(window.Wealthnord.etat()));
    S.budget.push({ k: null, nom: "Ligne sans identifiant", montant: 25, periode: "mois", qui: "moi" });
    S.revenu.lignes = [{ k: null, nom: "Revenu sans identifiant", montant: 1000, periode: "an" }];
    localStorage.setItem("boussole.v1", JSON.stringify(S));
  });
  await p.reload(); await p.waitForTimeout(800);
  verifier("démarrage : lignes sans identifiant acceptées", await p.evaluate(() => !!(window.Wealthnord && window.Wealthnord.resultats())));
  verifier("démarrage : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 6. Noms piégés (fichier malveillant) : aucun code ne s'exécute, dans les pages ni dans le rapport. */
async function injection(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { largeur: 1280 });
  await p.evaluate(() => {
    const X = n => `<img src=x onerror="window.__xss=(window.__xss||[]).concat('${n}')">`;
    const S = JSON.parse(JSON.stringify(window.Wealthnord.etat()));
    S.dettes.forEach((d, i) => { d.nom = X("dette" + i); });
    S.revenu.activites.forEach(a => { a.nom = X("activite"); });
    S.revenu.lignes = [{ id: "r1", k: null, nom: X("ligne"), montant: 100, periode: "mois" }];
    S.budget.push({ id: "b1", k: null, nom: X("budget"), montant: 50, periode: "mois", qui: "moi" });
    S.epargne.reee.enfants = [{ id: "e1", nom: X("enfant"), age: 3, solde: 0 }];
    S.objectifs = [{ id: "o1", type: "autre", nom: X("objectif"), cible: 5000, date: "2028-01" }];
    S.jalonsPerso = [{ id: "j1", nom: X("jalon"), annee: 2030 }];
    S.actifs.autres = [{ id: "x1", type: "autre", nom: X("actif"), valeur: 1000, croissance: 2, partMoi: 100 }];
    S.dossier = { vieAssureur: X("dossier"), notes: X("notes") };
    S.plans = [{ id: "p1", nom: X("plan"), donnees: JSON.parse(JSON.stringify(S)) }];
    S.meta.exemple = false;
    localStorage.setItem("boussole.v1", JSON.stringify(S));
  });
  await p.reload(); await pret(p);
  for (const page of ["apercu", "revenu", "impot", "budget", "avenir", "donnees"]) await allerA(p, page);
  await p.evaluate(() => { const r = window.Wealthnord.rapport; r.construire(); r.construire({ fiche: true }); });
  await p.waitForTimeout(500);
  verifier("noms piégés : aucun code exécuté", !(await p.evaluate(() => window.__xss)), await p.evaluate(() => window.__xss));
  verifier("noms piégés : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 7. Rapport PDF : pages, hypothèses et sources ; fiche d'une page. */
async function rapport(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { largeur: 1280 });
  const r = await p.evaluate(() => {
    const R = window.Wealthnord.rapport, boite = document.getElementById("rapport");
    R.construire(); const pages = boite.querySelectorAll(".rp-page").length, texte = boite.textContent;
    R.construire({ fiche: true }); const fiche = boite.querySelectorAll(".rp-page").length;
    boite.textContent = "";
    return { pages, fiche, sources: texte.includes("Hypothèses et sources"), annexe: texte.includes("Tarif horaire (annexe XIV)"), brochure: texte.includes("Brochure no 1") };
  });
  verifier("rapport : 8 pages au plus", r.pages >= 5 && r.pages <= 8, r.pages);
  verifier("rapport : hypothèses, tarifs et sources", r.sources && r.annexe && r.brochure, r);
  verifier("fiche : une page", r.fiche === 1, r.fiche);
  verifier("rapport : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 8. Nouvelle version publiée pendant que l'app est ouverte : un avis propose de recharger. */
async function nouvelleVersion(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { sw: true });
  const avis = () => p.evaluate(() => { navigator.serviceWorker.dispatchEvent(new Event("controllerchange"));
    return new Promise(r => setTimeout(() => r(document.getElementById("toast").hidden ? "" : document.getElementById("toast-annuler").textContent), 200)); });
  await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => {});
  await p.reload(); await pret(p);
  verifier("nouvelle version : avis avec « Recharger »", (await avis()) === "Recharger");
  verifier("nouvelle version : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 9. Budget : trésorerie des 12 prochains mois, report par catégorie, bilan de l'année. */
async function budget(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "budget" });
  const t = await p.evaluate(() => ({ mois: document.querySelectorAll("#bu-tresorerie .rangee").length, resume: document.getElementById("bu-tresorerie-resume").textContent }));
  verifier("trésorerie : 12 mois et un résumé", t.mois === 12 && t.resume.length > 20, t);
  // Année type : la trésorerie de 12 mois égale 12 fois le surplus.
  await remplacer(p, { "revenu.annee": "type" });
  const ecart = await p.evaluate(() => { const R = window.Wealthnord.resultats(), T = window.Wealthnord.outils.tresorerie(R); return T.mois.reduce((s, x) => s + x.solde, 0) - 12 * R.surplusMoi; });
  verifier("trésorerie : année type = 12 × surplus", Math.abs(ecart) < 1, ecart);
  await remplacer(p, { bilans: [
    { id: "m1", mois: "2026-07", recu: 9000, depense: 3000, note: "", cats: { Alimentation: 600 } },
    { id: "m2", mois: "2026-08", recu: 9100, depense: 3400, note: "Vacances", cats: { Alimentation: 450 } } ] });
  const a = await p.evaluate(() => ({ annee: document.getElementById("bu-annee").textContent.replace(/\s/g, " "), bilan: document.getElementById("bu-bilan").textContent }));
  verifier("bilan de l'année : mois notés et mois le plus cher", a.annee.includes("2 mois notés") && a.annee.includes("Mois le plus cher"), a.annee);
  verifier("report par catégorie : Alimentation", a.bilan.includes("Report par catégorie") && a.bilan.includes("Alimentation"), a.bilan);
  await allerA(p, "budget/mois");
  const calme = await p.evaluate(() => ({
    titres: [...document.querySelectorAll("#bu-depenses .rangee")].filter(x => x.offsetParent).map(x => x.querySelector(".rangee-titre").textContent),
    vides: document.getElementById("bu-cats-vides").open,
    reste: document.getElementById("bu-reste").closest("details").open,
    bilan: document.getElementById("bu-bilan-resume").textContent,
  }));
  verifier("budget : les catégories vides et le bilan sont repliés", !calme.vides && !calme.reste && calme.titres.includes("Logement") && !calme.titres.includes("Enfants") && calme.bilan.length > 3, calme);
  await allerA(p, "budget");
  const avant = await p.evaluate(() => Math.round(window.Wealthnord.resultats().depMoi));
  await p.click("#bu-passer-estimation"); await p.waitForTimeout(300);
  const estime = await p.evaluate(() => { const S = window.Wealthnord.etat();
    return { actif: S.budgetSimple.actif, reste: S.budgetSimple.reste, dep: Math.round(window.Wealthnord.resultats().depMoi),
      loyer: document.getElementById("bu-loyer-resume").value, vu: !!document.getElementById("bu-r-editeur").offsetParent }; });
  verifier("budget : l'estimation reprend le loyer et le reste, sans changer le total", estime.actif && estime.vu && estime.loyer === "1800" && estime.reste === avant - 1800 && estime.dep === avant, { estime, avant });
  await p.fill("#bu-reste-resume", "1000"); await p.waitForTimeout(400);
  verifier("budget : changer le reste change les dépenses du mois", await p.evaluate(() => Math.round(window.Wealthnord.resultats().depMoi) === 2800));
  await p.click("#bu-revenir-detail"); await p.waitForTimeout(300);
  const retour = await p.evaluate(() => ({ actif: window.Wealthnord.etat().budgetSimple.actif, dep: Math.round(window.Wealthnord.resultats().depMoi), bouton: !!document.getElementById("bu-passer-estimation") }));
  verifier("budget : le détail de chaque poste revient, avec le même total", !retour.actif && retour.dep === avant && retour.bouton, { retour, avant });
  await p.evaluate(() => {
    const S = JSON.parse(localStorage.getItem("boussole.v1"));
    S.budgetSimple.actif = true;
    const l = S.budget.find(x => x.k === "garderie");
    if (l) Object.assign(l, { montant: 1000, periode: "mois", qui: "moi" });
    S.epargne.reee.enfants = [{ id: "e1", nom: "Enfant", age: 4, solde: 0, cotisations: 0 }];
    localStorage.setItem("boussole.v1", JSON.stringify(S));
  });
  await p.reload(); await pret(p);
  const gardeEstimee = await p.evaluate(() => {
    const R = window.Wealthnord.resultats(), S = window.Wealthnord.etat();
    const loyer = S.budget.filter(b => b.k === "loyer").reduce((t, b) => t + (b.periode === "an" ? b.montant / 12 : b.montant), 0);
    return { actif: !!(S.budgetSimple && S.budgetSimple.actif), credit: R.garde.creditQc, frais: R.garde.fraisQc,
      dep: R.depMoi, loyer, reste: +(S.budgetSimple && S.budgetSimple.reste) || 0, ligne: !!S.budget.find(x => x.k === "garderie" && x.montant === 1000) };
  });
  verifier("budget : en estimation, la garderie du détail donne encore le crédit, sans gonfler les dépenses",
    gardeEstimee.actif && gardeEstimee.ligne && gardeEstimee.frais === 12000 && gardeEstimee.credit > 500
    && Math.abs(gardeEstimee.dep - (gardeEstimee.loyer + gardeEstimee.reste)) < 0.01, gardeEstimee);
  verifier("budget : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 10. Logo : le lion à côté du nom (étoile) ; au clic, la séquence du sceau, puis l'accueil. */
async function logo(b, base) {
  const icone = fs.readFileSync(path.join(RACINE, "icone.svg"), "utf8");
  const vb = icone.match(/viewBox="([0-9.]+) ([0-9.]+) ([0-9.]+) ([0-9.]+)"/);
  const cote = vb ? +vb[3] : 0;
  verifier("icône : le sceau remplit le carré", !!vb && cote > 440 && cote < 490 && +vb[1] > 10 && !/rx=/.test(icone) && !/translate\(28/.test(icone), vb && vb[0]);
  const masque = fs.readFileSync(path.join(RACINE, "icones/icone-masquable.svg"), "utf8");
  verifier("icône masquable : le sceau va jusqu'au bord utile", !/translate\(70/.test(masque) && !/scale\(0\.72/.test(masque) && /viewBox="-/.test(masque));
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "budget" });
  verifier("en-tête : le lion seul", await p.evaluate(() => document.querySelector(".barre-haut .marque-ico use").getAttribute("href") === "#wm-lion"));
  verifier("nom : une étoile entre Wealth et Morand", await p.evaluate(() => !!document.querySelector("#wm-nom .etoile")));
  verifier("ouverture : un seul dessin au centre", await p.evaluate(() => document.querySelectorAll(".ouverture .ouverture-centre").length === 1
    && document.querySelector(".ouverture-centre").getAttribute("data-motif") === "#wm-g-cedre"));
  const empreinte = buf => crypto.createHash("sha256").update(buf).digest("hex");
  // L'observation commence avant le clic : le premier dessin (le cèdre) peut ne durer qu'un instant.
  const pendantPromesse = p.evaluate(() => new Promise(resolve => {
    const vus = [];
    const echantillon = () => {
      const c = document.querySelector(".ouverture-centre");
      vus.push({ motif: c && c.getAttribute("data-motif"), tag: c && c.tagName, centres: document.querySelectorAll(".ouverture-centre").length, chemins: c ? c.querySelectorAll("path").length : 0,
        joue: document.querySelector(".ouverture").classList.contains("joue") });
    };
    echantillon();
    const id = setInterval(echantillon, 70);
    setTimeout(() => { clearInterval(id); resolve({ joue: document.querySelector(".ouverture").classList.contains("joue"), vus }); }, 800);
  }));
  await p.click(".barre-haut a.marque");
  const dessin1 = empreinte(await p.locator(".ouverture-sceau").screenshot());
  await p.waitForTimeout(280);
  const dessin2 = empreinte(await p.locator(".ouverture-sceau").screenshot());
  verifier("logo : le dessin affiché change", dessin1 !== dessin2);
  const pendant = await pendantPromesse;
  const suite = ["#wm-g-cedre", "#wm-g-balance", "#wm-g-boussole", "#wm-g-cerf", "#wm-g-racines", "#wm-g-lion"];
  const enJeu = pendant.vus.filter(v => v.joue);
  const ordre = enJeu.map(v => v.motif).filter((h, i, a) => h !== a[i - 1]);
  const unSeul = enJeu.length > 0 && enJeu.every(v => v.centres === 1 && v.tag === "g" && v.chemins === 1);
  verifier("logo : les dessins se suivent, un à la fois", pendant.joue && unSeul && ordre.join() === suite.join(), { ordre, unSeul });
  await p.waitForTimeout(900);
  const apres = await p.evaluate(() => ({ joue: document.querySelector(".ouverture").classList.contains("joue"), page: location.hash, motif: document.querySelector(".ouverture-centre").getAttribute("data-motif") }));
  verifier("logo : on termine sur le lion, puis l'accueil", !apres.joue && apres.page === "#apercu" && apres.motif === "#wm-g-lion", apres);
  verifier("logo : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 11. Sous-onglets : Budget et Patrimoine montrent une partie à la fois ; un lien peut viser un onglet. */
async function sousOnglets(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "budget/detail" });
  const visibles = page => p.evaluate(pg => [...document.querySelectorAll(`#v-${pg} .carte[data-sous]`)]
    .filter(c => getComputedStyle(c).display !== "none").map(c => c.dataset.sous), page);
  const budgetMois = await visibles("budget");
  verifier("sous-onglets : Budget s'ouvre sur « Ce mois-ci »", budgetMois.length > 0 && budgetMois.every(s => s === "mois"), budgetMois);
  await p.click("#bu-onglets button:nth-child(2)"); await p.waitForTimeout(200);
  const annee = await p.evaluate(() => { const s = document.querySelector("#bu-tresorerie-graph svg"); return s ? +s.getAttribute("width") : 0; });
  verifier("sous-onglets : « L'année » affiche la trésorerie", (await visibles("budget")).every(s => s === "annee") && annee > 200, annee);
  await allerA(p, "apercu");
  await allerA(p, "budget/dettes");
  const dettes = await visibles("budget");
  verifier("sous-onglets : #budget/dettes ouvre les dettes", dettes.length > 0 && dettes.every(s => s === "dettes") && await p.evaluate(() => location.hash) === "#budget/dettes", dettes);
  await allerA(p, "avenir/detail");
  const parOnglet = {};
  for (const [i, cle] of ["aujourdhui", "projection", "placements", "proches"].entries()) {
    await p.click(`#pa-onglets button:nth-child(${i + 1})`); await p.waitForTimeout(150);
    const v = await visibles("avenir"); parOnglet[cle] = v.length;
    verifier(`sous-onglets : Patrimoine « ${cle} »`, v.length > 0 && v.every(s => s === cle), v);
  }
  // Chaque carte appartient à un onglet : la somme des onglets égale le nombre de cartes.
  const total = await p.evaluate(() => document.querySelectorAll("#v-avenir .carte[data-sous]").length);
  verifier("sous-onglets : aucune carte oubliée", Object.values(parOnglet).reduce((a, n) => a + n, 0) === total, { parOnglet, total });
  await p.reload(); await pret(p);
  await allerA(p, "avenir"); await allerA(p, "avenir/detail");
  verifier("sous-onglets : l'onglet choisi est gardé", (await visibles("avenir")).every(s => s === "proches") && await p.evaluate(() => location.hash) === "#avenir/proches");
  verifier("sous-onglets : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 12. Répartition des placements : le profil donne la cible ; les obligations vont d'abord au REER. */
async function repartition(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "avenir" });
  await remplacer(p, { "epargne.reer.solde": 20000, "epargne.celi.solde": 20000, "epargne.profil": "equilibre", "epargne.pctActionsActuel": 75 });
  const t = await p.evaluate(() => document.getElementById("pa-repartition").textContent.replace(/\s/g, " "));
  verifier("répartition : cible de 60 % en actions", t.includes("60 %"), t);
  verifier("répartition : écart avec la part actuelle", /déplacez environ/.test(t), t);
  verifier("répartition : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 13. Verrou par phrase de passe : données chiffrées, écran du verrou, sauvegardes chiffrées, phrase changée, retrait. */
async function verrou(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "donnees" });
  const PHRASE = "trois chats dansent", NOUVELLE = "quatre hiboux chantent";
  const brut = (await resultat(p)).brut, nDettes = await p.evaluate(() => window.Wealthnord.etat().dettes.length);
  const stocke = () => p.evaluate(() => localStorage.getItem("boussole.v1"));
  const deverrouiller = async phrase => {
    await p.fill("#verrou-phrase", phrase); await p.click("#verrou-ouvrir");
    await p.waitForFunction(() => window.Wealthnord || document.getElementById("verrou-message").textContent.includes("incorrecte"));
    return p.evaluate(() => !!window.Wealthnord);
  };
  const etat = () => p.evaluate(() => document.getElementById("verrou-etat").textContent);
  // Activer : phrase trop courte, puis deux phrases différentes, puis la bonne.
  await p.fill("#vr-nouvelle", "court"); await p.fill("#vr-confirmer", "court"); await p.click("#carte-verrou button[type=submit]");
  verifier("verrou : phrase trop courte refusée", (await etat()) === "Désactivé");
  await p.fill("#vr-nouvelle", PHRASE); await p.fill("#vr-confirmer", PHRASE + "!"); await p.click("#carte-verrou button[type=submit]");
  verifier("verrou : phrases différentes refusées", (await etat()) === "Désactivé");
  await p.fill("#vr-confirmer", PHRASE); await p.click("#carte-verrou button[type=submit]");
  await p.waitForFunction(() => document.getElementById("verrou-etat").textContent === "Activé");
  const t = await stocke();
  verifier("verrou : données chiffrées dans le navigateur", t.startsWith('{"wealthmorand":"chiffre"') && !t.includes("revenu"), t.slice(0, 40));
  // Sauvegarde exportée : chiffrée elle aussi.
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#exporter")]);
  const exportChiffre = fs.readFileSync(await dl.path(), "utf8");
  verifier("verrou : sauvegarde exportée chiffrée", exportChiffre.startsWith('{"wealthmorand":"chiffre"') && /chiffrees/.test(dl.suggestedFilename()), dl.suggestedFilename());
  // Une sauvegarde ordinaire restaurée pendant que le verrou est actif est gardée chiffrée.
  const simple = await p.evaluate(() => JSON.stringify({ ...window.Wealthnord.etat(), dettes: [] }));
  await p.setInputFiles("#importer", { name: "simple.json", mimeType: "application/json", buffer: Buffer.from(simple) });
  await p.waitForSelector("#feuille-corps .bouton.danger"); await p.click("#feuille-corps .bouton.danger");
  await p.waitForFunction(() => window.Wealthnord.etat().dettes.length === 0);
  await p.waitForTimeout(200);
  verifier("verrou : restauration gardée chiffrée", (await stocke()).startsWith('{"wealthmorand":"chiffre"'));
  // Rechargée : seul l'écran du verrou paraît ; l'app ne démarre qu'avec la bonne phrase.
  await p.reload(); await p.waitForSelector("#verrou-phrase");
  const ecran = await p.evaluate(() => ({ app: getComputedStyle(document.querySelector(".app")).display, verrou: getComputedStyle(document.getElementById("verrou")).display, W: !!window.Wealthnord }));
  verifier("verrou : écran du verrou, app cachée", ecran.app === "none" && ecran.verrou !== "none" && !ecran.W, ecran);
  verifier("verrou : mauvaise phrase refusée", !(await deverrouiller("mauvaise phrase")));
  verifier("verrou : bonne phrase, données ouvertes", await deverrouiller(PHRASE) && (await p.evaluate(() => window.Wealthnord.etat().dettes.length)) === 0);
  // La sauvegarde chiffrée se restaure avec sa phrase.
  await allerA(p, "donnees");
  await p.setInputFiles("#importer", { name: "chiffre.json", mimeType: "application/json", buffer: Buffer.from(exportChiffre) });
  await p.waitForSelector("#fichier-chiffre:not([hidden])");
  await p.fill("#fichier-phrase", "mauvaise phrase"); await p.click("#fichier-chiffre button[type=submit]");
  await p.waitForFunction(() => document.getElementById("donnees-message").textContent.includes("incorrecte"));
  await p.fill("#fichier-phrase", PHRASE); await p.click("#fichier-chiffre button[type=submit]");
  await p.waitForSelector("#feuille-corps .bouton.danger", { timeout: 20000 }); await p.click("#feuille-corps .bouton.danger");
  await p.waitForFunction(n => window.Wealthnord.etat().dettes.length === n, nDettes);
  verifier("verrou : sauvegarde chiffrée restaurée", (await resultat(p)).brut === brut && await p.evaluate(() => document.getElementById("fichier-chiffre").hidden));
  // Changer la phrase : l'ancienne n'ouvre plus les données.
  await p.evaluate(() => { document.querySelector("#carte-verrou details").open = true; });
  await p.fill("#vr-actuelle", "mauvaise phrase"); await p.fill("#vr-nouvelle", NOUVELLE); await p.fill("#vr-confirmer", NOUVELLE);
  await p.click("#carte-verrou button[type=submit]");
  await p.waitForFunction(() => document.querySelector("#carte-verrou .message").textContent.includes("incorrecte"));
  await p.fill("#vr-actuelle", PHRASE); await p.click("#carte-verrou button[type=submit]");
  await p.waitForFunction(() => document.querySelector("#carte-verrou .message").textContent.includes("Phrase changée"));
  await p.reload(); await p.waitForSelector("#verrou-phrase");
  verifier("verrou : l'ancienne phrase n'ouvre plus", !(await deverrouiller(PHRASE)));
  verifier("verrou : la nouvelle phrase ouvre", await deverrouiller(NOUVELLE) && (await resultat(p)).brut === brut);
  // Retirer le verrou : les données redeviennent lisibles.
  await allerA(p, "donnees");
  await p.evaluate(() => { document.querySelector("#carte-verrou details").open = true; });
  await p.fill("#vr-actuelle", NOUVELLE); await p.click("#carte-verrou button.danger");
  await p.waitForFunction(() => document.getElementById("verrou-etat").textContent === "Désactivé");
  verifier("verrou : retiré, données non chiffrées", (await stocke()).includes('"revenu"'));
  verifier("verrou : aucune erreur", erreurs.length === 0 && (await p.evaluate(() => window.__csp.length)) === 0, erreurs);
  await ctx.close();
}

/* 14. Verrou : il se referme après le délai sans utilisation ; « Phrase oubliée » efface les données de l'appareil. */
async function verrouDelai(b, base) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const p = await ctx.newPage(), erreurs = [];
  p.on("pageerror", e => erreurs.push(String(e)));
  await ctx.addInitScript(() => { try { localStorage.setItem("wm.assistant", "1"); sessionStorage.setItem("wm.ouverture", "1"); } catch (e) { /* stockage indisponible */ } });
  await p.clock.install();
  await p.goto(`${base}/index.html#donnees`); await pret(p);
  await p.fill("#vr-nouvelle", "trois chats dansent"); await p.fill("#vr-confirmer", "trois chats dansent"); await p.click("#carte-verrou button[type=submit]");
  await p.waitForFunction(() => document.getElementById("verrou-etat").textContent === "Activé");
  await p.selectOption("#vr-delai", "1");
  await p.clock.runFor(30000);
  verifier("verrou : ouvert avant le délai", await p.evaluate(() => !document.documentElement.classList.contains("verrouille")));
  await Promise.all([p.waitForEvent("load"), p.clock.runFor(45000)]);
  await p.waitForSelector("#verrou-phrase");
  verifier("verrou : refermé après une minute sans utilisation", await p.evaluate(() => document.documentElement.classList.contains("verrouille") && !window.Wealthnord));
  await p.click("#verrou summary"); await p.click("#verrou-effacer"); await p.click("#verrou-effacer-oui");
  await p.waitForFunction(() => window.Wealthnord && window.Wealthnord.resultats());
  verifier("verrou : phrase oubliée, données effacées, l'exemple revient", await p.evaluate(() => !document.documentElement.classList.contains("verrouille") && !localStorage.getItem("boussole.v1")));
  verifier("verrou (délai) : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 15. Deux onglets : le verrou activé dans l'un, l'autre se recharge sur l'écran du verrou sans rien réécrire en clair. */
async function verrouOnglets(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "donnees" });
  const p2 = await ctx.newPage(); p2.on("pageerror", e => erreurs.push(String(e)));
  await p2.goto(`${base}/index.html#apercu`); await pret(p2);
  await p.fill("#vr-nouvelle", "trois chats dansent"); await p.fill("#vr-confirmer", "trois chats dansent"); await p.click("#carte-verrou button[type=submit]");
  await p.waitForFunction(() => document.getElementById("verrou-etat").textContent === "Activé");
  await p2.waitForSelector("#verrou-phrase", { state: "visible", timeout: 5000 });
  await p2.waitForTimeout(300);
  verifier("deux onglets : l'autre onglet se verrouille", await p2.evaluate(() => document.documentElement.classList.contains("verrouille")));
  verifier("deux onglets : les données restent chiffrées", (await p.evaluate(() => localStorage.getItem("boussole.v1"))).startsWith('{"wealthmorand":"chiffre"'));
  verifier("deux onglets : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 16. Sommaire pour le comptable : une seule page Lettre, même avec beaucoup de documents à rassembler. */
async function sommaireComptable(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { largeur: 1280, page: "impot" });
  const pagesPdf = async () => {
    await p.evaluate(() => { window.Wealthnord.rapport.construire({ comptable: true }); document.body.classList.add("impression-rapport"); });
    await p.emulateMedia({ media: "print" });
    const pdf = await p.pdf({ format: "Letter", printBackground: true, preferCSSPageSize: true });
    // Hauteur à la largeur imprimable d'une page Lettre (718 px sur 950) : une marge pour les autres navigateurs.
    await p.setViewportSize({ width: 718, height: 950 });
    const hauteur = await p.evaluate(() => document.querySelector("#rapport .rp-page").getBoundingClientRect().height / 950);
    await p.setViewportSize({ width: 1280, height: 844 });
    await p.emulateMedia({ media: "screen" });
    const texte = await p.evaluate(() => { document.body.classList.remove("impression-rapport"); const t = document.getElementById("rapport").textContent; document.getElementById("rapport").textContent = ""; return t; });
    return { pages: (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length, texte, hauteur };
  };
  verifier("comptable : deux boutons (Impôt et Données)", (await p.locator("[data-comptable]").count()) === 2);
  const a = await pagesPdf();
  verifier("comptable : une page", a.pages === 1, a.pages);
  const anImpot = await p.evaluate(() => window.Wealthnord.resultats().parametres.annee);   // l'année du plan : 2026, puis 2027
  verifier("comptable : revenus, impôt, échéances et documents", ["Revenus et déductions", `Impôt estimé ${anImpot}`, "Échéances", "Documents à rassembler"].every(t => a.texte.includes(t)));
  // Situation chargée : couple, enfants, détail des dépenses, REER, CELIAPP, garderie, frais médicaux, dons.
  await p.evaluate(() => {
    const S = JSON.parse(JSON.stringify(window.Wealthnord.etat()));
    Object.assign(S.conjointe, { active: true, statut: "autonome", revenuAutonome: 70000, depensesAutonome: 8000 });
    Object.assign(S.epargne.reer, { droits: 30000, cotisationAnnuelle: 10000 }); S.epargne.celiapp.cotisationAnnuelle = 8000;
    S.epargne.reee.enfants = [{ age: 2 }, { age: 5 }, { age: 9 }]; S.revenu.annee = "type"; S.impot.depensesProMode = "detail";
    for (const [k, v] of [["cmq", 1930], ["fmoq", 2400], ["acpm", 560], ["formation", 2500], ["auto", 1800], ["bureau", 1200], ["telecom", 600]]) S.impot.depensesProDetail.find(x => x.k === k).montant = v;
    for (const [k, v] of [["garderie", 200], ["dentiste", 60], ["orthodontie", 150], ["lunettes", 30], ["dons", 50], ["fraisPlacements", 40]]) { const l = S.budget.find(x => x.k === k); if (l) l.montant = v; }
    S.revenu.lignes = [{ k: "placements", montant: 3000, periode: "an" }];
    S.dettes.push({ id: "dx", nom: "Prêt étudiant", type: "pret", solde: 30000, taux: 5, paiement: 300, creditImpot: 1 });
    S.meta.exemple = false; localStorage.setItem("boussole.v1", JSON.stringify(S));
  });
  await p.reload(); await pret(p);
  const c = await pagesPdf();
  verifier("comptable chargé : toujours une page, avec de la marge", c.pages === 1 && c.hauteur <= 0.92, { pages: c.pages, hauteur: Math.round(c.hauteur * 100) + " %" });
  verifier("comptable chargé : acomptes, REER, garde et partenaire", [`Acomptes ${anImpot}`, "REER : droits inutilisés", "Frais de garde", "Votre partenaire"].every(t => c.texte.includes(t)), c.texte.slice(0, 300));
  verifier("comptable : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 17. Probabilité de réussite : les tirages se font autour de la moyenne arithmétique (MG + σ²/2, Normes 2026) ;
   la médiane des avenirs rejoint donc la projection du scénario. */
async function monteCarlo(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "avenir" });
  const r = await p.evaluate(() => { const R = window.Wealthnord.resultats(), M = R.monteCarlo(300, 10), fin = R.projection.length - 1;
    return { mediane: M.quantile("moi", fin, 0.5), projection: R.projection[fin].moi, p10: M.quantile("moi", fin, 0.1), p90: M.quantile("moi", fin, 0.9) }; });
  verifier("probabilité : la médiane rejoint la projection (à 3 % près)", Math.abs(r.mediane / r.projection - 1) < 0.03, r);
  verifier("probabilité : la projection entre le 1er et le 9e décile", r.p10 < r.projection && r.projection < r.p90, r);
  verifier("probabilité : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 18. Un seul « net après impôt et frais » : la tuile de l'aperçu, la page Revenu et le « Reste pour vous » de la
   page Impôt montrent le même montant. Sans aucune dépense entrée, l'aperçu montre le revenu net, pas un surplus. */
async function apercuCoherent(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base);
  const montant = t => +String(t).replace(/[^\d]/g, "");
  const tuile = montant(await p.textContent('#ap-tuiles a[href="#impot"] .tuile-valeur'));
  const sous = await p.textContent('#ap-tuiles a[href="#impot"] .tuile-sous');
  await allerA(p, "revenu");
  const revenu = montant((await p.textContent("#rv-hero .hero-sous span")).split(":")[1]);
  await allerA(p, "impot");
  const reste = montant(await p.evaluate(() => [...document.querySelectorAll("#im-cent .rangee")]
    .find(r => r.querySelector(".rangee-titre").textContent === "Reste pour vous").querySelector(".rangee-valeur-sous").textContent));
  verifier("net : même montant dans l'aperçu, la page Revenu et la page Impôt", tuile > 0 && tuile === revenu && revenu === reste, { tuile, revenu, reste });
  verifier("net : « Après impôt et frais » sous la tuile", sous === "Après impôt et frais", sous);

  // Assistant : propriétaire, sans dettes ni dépenses.
  await allerA(p, "apercu");
  await p.click("#ap-assistant");
  const suivant = () => p.click("#as-suivant");
  await suivant(); await p.check('input[name="as-famille"][value="seul"]'); await suivant(); await suivant();
  await p.check('input[name="as-milieu"][value="gmfu"]'); await suivant();
  await p.fill("#as-patientsParDJ", "8"); await suivant(); await suivant(); await suivant();
  await p.check('input[name="as-logement"][value="proprietaire"]'); await suivant(); await suivant(); await suivant();
  await p.waitForTimeout(300);
  const neuf = await p.evaluate(() => ({ etiquette: document.querySelector("#ap-hero .hero-etiquette").textContent, lien: !!document.querySelector('#ap-hero a[href="#budget/mois"]') }));
  verifier("aperçu sans dépenses : revenu net et lien vers le budget", neuf.etiquette === "Votre revenu net mensuel" && neuf.lien, neuf);
  await remplacer(p, { "budget.0.montant": 500 });
  verifier("aperçu avec une dépense : surplus", (await p.textContent("#ap-hero .hero-etiquette")) === "Votre surplus mensuel");
  verifier("aperçu : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 18 b. Assistant depuis un stockage vide : la pratique ne garde rien de la clientèle, du rythme ni des frais de
   l'exemple ; les semaines en clinique, 52 moins les vacances ; dépenses professionnelles à 0 ; prêt étudiant avec son
   taux et son paiement (aucun paiement : intérêts seulement) ; « Vos revenus » n'est pas coché à la simple ouverture. */
async function assistantVide(b, base) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const p = await ctx.newPage(), erreurs = [];
  p.on("pageerror", e => erreurs.push(String(e)));
  await ctx.addInitScript(() => { try { sessionStorage.setItem("wm.ouverture", "1"); } catch (e) { /* stockage indisponible */ } });
  await p.goto(`${base}/index.html`); await pret(p);
  await p.waitForSelector("#assistant[open]", { timeout: 5000 });
  const suivant = () => p.click("#as-suivant"), message = () => p.textContent("#as-message");
  await suivant(); await p.check('input[name="as-famille"][value="seul"]'); await suivant(); await suivant();
  await p.check('input[name="as-milieu"][value="clinique"]'); await suivant();
  await suivant();
  verifier("assistant vide : les patients par demi-journée sont demandés", (await message()).includes("patients que vous voyez par demi-journée"), await message());
  await p.fill("#as-patientsParDJ", "9"); await p.fill("#as-vacances", "7"); await suivant();
  await p.fill("#as-inscrits", "0"); await p.fill("#as-nouveaux", "300"); await p.fill("#as-vulnerables", "25"); await p.fill("#as-fraisPct", "28");
  await suivant(); await suivant();
  await p.check('input[name="as-logement"][value="locataire"]'); await p.fill("#as-loyer", "1500"); await suivant();
  await p.check("#as-pret"); await p.fill("#as-pretSolde", "40000"); await suivant();
  verifier("assistant vide : le taux du prêt étudiant est demandé", (await message()).includes("taux de votre prêt étudiant"), await message());
  await p.fill("#as-pretTaux", "6.45"); await suivant();
  const recap = await p.textContent("#as-corps");
  verifier("assistant vide : le récapitulatif montre la semaine et la clientèle", recap.includes("9 patients") && recap.includes("45 semaines en clinique") && recap.includes("300 nouveaux attendus")
    && recap.includes("25 % vulnérables") && recap.includes("28 % remis à la clinique") && recap.includes("Sans partenaire"), recap);
  await suivant(); await p.waitForTimeout(300);
  const x = await p.evaluate(() => { const S = window.Wealthnord.etat(), r = S.revenu, d = S.dettes.find(z => z.creditImpot);
    return { pdj: r.patientsParDJ, guichet: r.nouveauxGuichet, vuln: r.partVulnerable, frais: r.fraisCabinetPct, semaines: r.semaines, transf: r.nouveauxTransferes, sans: r.nouveauxSansMedecin,
      pro: S.impot.depensesPro, exemple: S.meta.exemple, pret: d && { taux: d.taux, paiement: d.paiement, interets: d.interetsSeulement }, gmf: r.membreGmf, gmfConfirme: !!S.confirmes["revenu.membreGmf"] }; });
  verifier("assistant vide : rien de l'exemple dans la pratique", x.pdj === 9 && x.guichet === 300 && x.vuln === 25 && x.frais === 28 && x.semaines === 45 && x.transf === 0 && x.sans === 0
    && x.pro === 0 && !x.exemple && !x.gmf && x.gmfConfirme, x);
  verifier("assistant vide : prêt étudiant au taux inscrit, intérêts seulement sans paiement", x.pret && x.pret.taux === 6.45 && x.pret.paiement === 0 && x.pret.interets, x.pret);
  // Ouvrir le panneau Revenu ne coche pas « Vos revenus » ; changer un champ, oui.
  await allerA(p, "revenu"); await p.click("#v-revenu .bouton-modifier"); await p.waitForTimeout(300);
  const vuAvant = await p.evaluate(() => !!(window.Wealthnord.etat().meta.vus || {}).revenu);
  await p.fill("#c-revenu-patientsParDJ", "10"); await p.waitForTimeout(200);
  const vuApres = await p.evaluate(() => !!(window.Wealthnord.etat().meta.vus || {}).revenu);
  verifier("assistant vide : ouvrir le panneau Revenu ne compte pas comme rempli ; changer un champ, oui", !vuAvant && vuApres, { vuAvant, vuApres });
  verifier("assistant vide : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 19. Assistant : en GMF-U et en CLSC, le mode de rémunération choisi devient celui du budget.
   Page Impôt : « Et avec une société ? » et « Vérification officielle » sont repliées, leur conclusion en vue. */
async function assistantMode(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base);
  await p.click("#ap-assistant");
  const suivant = () => p.click("#as-suivant");
  await suivant(); await p.check('input[name="as-famille"][value="seul"]'); await suivant(); await suivant();
  verifier("assistant : pas de choix de mode avant le milieu", !(await p.$('input[name="as-mode"]')));
  await p.check('input[name="as-milieu"][value="clinique"]');
  verifier("assistant : pas de choix de mode en clinique", !(await p.$('input[name="as-mode"]')));
  await p.check('input[name="as-milieu"][value="gmfu"]');
  verifier("assistant : taux horaire coché d'office", await p.isChecked('input[name="as-mode"][value="horaire"]'));
  await p.check('input[name="as-mode"][value="mixte"]');
  await suivant(); await p.fill("#as-patientsParDJ", "8"); await suivant(); await suivant(); await suivant();
  await p.check('input[name="as-logement"][value="locataire"]'); await suivant(); await suivant();
  verifier("assistant : le mode dans le récapitulatif", (await p.textContent("#as-corps")).includes("GMF-U · taux mixte"));
  await suivant(); await p.waitForTimeout(300);
  const r = await resultat(p);
  verifier("assistant : GMF-U au mixte", r.milieu === "gmfu" && r.mode === "mixte", { milieu: r.milieu, mode: r.mode });
  await allerA(p, "impot/detail");
  const cartes = await p.evaluate(() => [...document.querySelectorAll("#v-impot details.carte-repliable")].map(d => ({ ouvert: d.open, resume: d.querySelector(".repli-resume").textContent })));
  verifier("impôt : deux cartes repliées, leur conclusion en vue", cartes.length === 2 && cartes.every(c => !c.ouvert && c.resume.length > 10), cartes);
  await p.click("#im-verif-resume");
  verifier("impôt : la vérification s'ouvre au toucher", await p.evaluate(() => document.getElementById("im-verif").closest("details").open && document.getElementById("im-verif").textContent.includes("identiques")));
  verifier("assistant et impôt : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 20. Rendement des scénarios selon le profil et les frais ; un rendement inscrit à la main est gardé. */
async function rendementProfil(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "avenir" });
  const lire = () => p.evaluate(() => { const R = window.Wealthnord.resultats(), S = window.Wealthnord.etat();
    return { reel: R.hyp.rendement, prudent: R.hypDe("prudent").rendement, optimiste: R.hypDe("optimiste").rendement, auto: S.scenarios.rendementAuto, texte: document.getElementById("vn-hyp").textContent.replace(/\s/g, " ") }; });
  let r = await lire();
  verifier("rendement : équilibré sans frais, 5,1 % avant frais", r.auto === true && Math.abs(r.reel - 5.14) < 1e-9 && r.texte.includes("Placements 5,1 % (60 % d'actions, avant frais)"), r);
  verifier("rendement : prudent et optimiste à 1,5 point", Math.abs(r.reel - r.prudent - 1.5) < 1e-9 && Math.abs(r.optimiste - r.reel - 1.5) < 1e-9, r);
  await remplacer(p, { "epargne.profil": "croissance", "epargne.frais": 1.5 });
  r = await lire();
  verifier("rendement : croissance (80 %) moins 1,5 % de frais", Math.abs(r.reel - (0.8 * 19.3 / 3 + 0.2 * 3.2 - 1.5)) < 1e-9 && r.texte.includes("après 1,5 % de frais"), r);
  await remplacer(p, { "scenarios.rendementAuto": false });
  r = await lire();
  verifier("rendement : décoché, celui inscrit (5 %)", r.reel === 5 && r.texte.includes("Placements 5 %,"), r);
  // Données d'avant : un rendement changé à la main reste ; celui de départ devient calculé.
  for (const [rendement, attendu] of [[4.2, false], [5, true]]) {
    await p.evaluate(x => { const S = JSON.parse(JSON.stringify(window.Wealthnord.etat())); delete S.scenarios.rendementAuto; S.scenarios.realiste.rendement = x; localStorage.setItem("boussole.v1", JSON.stringify(S)); }, rendement);
    await p.reload(); await pret(p);
    r = await lire();
    verifier(`rendement : données d'avant à ${rendement} %, ${attendu ? "calculé" : "gardé"}`, r.auto === attendu && (attendu ? r.reel !== rendement : r.reel === rendement), r);
  }
  verifier("rendement : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 21. Lexique : les sigles de la RAMQ s'expliquent au toucher, jamais dans un bouton, un lien, une étiquette ou un titre ;
   Échap ferme la bulle (pas le panneau) et rend le focus au mot. */
async function lexiqueRamq(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "revenu/detail" });
  const termes = await p.evaluate(() => [...document.querySelectorAll("#v-revenu .terme")].map(x => x.dataset.terme));
  verifier("lexique : sigles marqués dans la page Revenu", ["EP 40", "DMÉ", "pratique polyvalente", "onglet B"].every(t => termes.includes(t)), termes);
  verifier("lexique : jamais dans un bouton, un lien, une étiquette ou un titre",
    (await p.evaluate(() => document.querySelectorAll("button .terme, a .terme, label .terme, summary .terme, h1 .terme, h2 .terme, h3 .terme, table .terme").length)) === 0);
  verifier("lexique : l'article élidé reste collé au mot", await p.evaluate(() => [...document.querySelectorAll(".terme-lie")].some(x => /^l['’]onglet B$/.test(x.textContent))));
  await p.evaluate(() => { const t = document.querySelector('#v-revenu .terme[data-terme="DMÉ"]'); t.scrollIntoView({ block: "center" }); t.id = "terme-dme"; });
  await p.waitForTimeout(300); await p.click("#terme-dme"); await p.waitForTimeout(100);
  const bulle = await p.evaluate(() => { const x = document.querySelector(".lexique-bulle"); return x && { role: x.getAttribute("role"), texte: x.textContent, etendu: document.getElementById("terme-dme").getAttribute("aria-expanded") }; });
  verifier("lexique : la bulle explique le DMÉ, avec sa référence", bulle && bulle.role === "status" && bulle.texte.includes("Dossier médical électronique") && bulle.texte.includes("EP 40, par. 17.01") && bulle.etendu === "true", bulle);
  await p.keyboard.press("Escape"); await p.waitForTimeout(100);
  verifier("lexique : Échap ferme la bulle et rend le focus au mot", await p.evaluate(() => !document.querySelector(".lexique-bulle") && document.activeElement.id === "terme-dme"));
  await p.click("#v-revenu [data-feuille]"); await p.waitForTimeout(300);
  await p.evaluate(() => { const t = [...document.querySelectorAll("#feuille-corps .terme")].find(x => x.offsetParent !== null); t.scrollIntoView({ block: "center" }); t.id = "terme-panneau"; });
  await p.waitForTimeout(300); await p.click("#terme-panneau"); await p.waitForTimeout(100);
  verifier("lexique : bulle dans le panneau « Modifier »", await p.evaluate(() => !!document.querySelector("#feuille .lexique-bulle")));
  await p.keyboard.press("Escape"); await p.waitForTimeout(100);
  verifier("lexique : Échap ferme la bulle, pas le panneau", await p.evaluate(() => document.getElementById("feuille").open && !document.querySelector(".lexique-bulle")));
  verifier("lexique : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 22. Frais de garde : couple, un enfant de 3 ans, garderie de 1 000 $ par mois payée en commun. Le ou la partenaire,
   au revenu le moins élevé, déduit 8 000 $ au fédéral ; crédit du Québec de 67 % de 12 000 $, partagé comme les frais. */
async function fraisGardeMenage(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "impot" });
  const regler = async m => { await p.evaluate(m => {
    const S = JSON.parse(JSON.stringify(window.Wealthnord.etat()));
    Object.assign(S.conjointe, { active: true, lien: "maries", statut: "salarie", salaire: 60000 }, m.conjointe || {});
    S.epargne.reee.enfants = [{ age: 3 }];
    const l = S.budget.find(x => x.k === "garderie"); Object.assign(l, { montant: 1000, periode: "mois", qui: "commun" });
    if (S.budgetTotaux && S.budgetTotaux.Enfants) S.budgetTotaux.Enfants.actif = false;
    S.famille.gardeSubventionnee = !!m.subventionnee; if (m.annee) S.revenu.annee = m.annee;
    S.meta.exemple = false; localStorage.setItem("boussole.v1", JSON.stringify(S));
  }, m); await p.reload(); await pret(p); };
  const lire = () => p.evaluate(() => { const R = window.Wealthnord.resultats(), S = window.Wealthnord.etat();
    return { ...R.garde, part: S.menage.partCommunMoi / 100, gardeMoi: R.gardeMoi, texte: document.getElementById("im-famille").textContent.replace(/\s/g, " ") }; });
  await regler({});
  let g = await lire();
  verifier("garde : déduction fédérale de 8 000 $ par le ou la partenaire", g.parPartenaire === true && g.deduction === 8000 && g.economieFed > 500, g);
  verifier("garde : crédit du Québec de 67 % de 12 000 $, partagé comme les frais", Math.abs(g.creditQc - 8040) < 1e-6 && Math.abs(g.creditMoi - 8040 * g.part) < 1e-6 && Math.abs(g.gardeMoi * 12 - g.creditMoi) < 1e-6, g);
  verifier("garde : affiché dans la page Impôt", g.texte.includes("Crédit du Québec") && g.texte.includes("67 % de 12 000 $") && g.texte.includes("8 000 $ déduits par votre"), g.texte.slice(0, 400));
  await allerA(p, "budget");
  verifier("garde : dans les revenus du budget", (await p.textContent("#bu-revenus")).includes("Crédit pour frais de garde"));
  await regler({ annee: "type" });
  const ecart = await p.evaluate(() => { const R = window.Wealthnord.resultats(), T = window.Wealthnord.outils.tresorerie(R); return T.mois.reduce((s, x) => s + x.solde, 0) - 12 * R.surplusMoi; });
  verifier("garde : trésorerie, année type = 12 × surplus", Math.abs(ecart) < 1, ecart);
  await regler({ subventionnee: true });
  g = await lire();
  verifier("garde : place subventionnée, pas de crédit du Québec, déduction gardée", g.creditQc === 0 && g.deduction === 8000, g);
  await regler({ conjointe: { statut: "sans", salaire: 0 } });
  g = await lire();
  verifier("garde : partenaire sans revenu gagné, aucune déduction", g.deduction === 0 && g.texte.includes("n'a pas de revenu gagné"), g.texte.slice(0, 300));
  verifier("garde : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 23. Prime d'assurance médicaments : avec les acomptes du Québec (et le solde de la première année), plus seule en avril.
   CELIAPP : plafond à vie sur les cotisations versées, sinon sur le solde. */
async function acomptesCeliapp(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "impot" });
  let r = await p.evaluate(() => { const R = window.Wealthnord.resultats();
    return { t: R.impot.total, prime: R.primeMoi, avril: [...document.querySelectorAll("#im-acomptes .rangee")].map(x => x.textContent.replace(/\s/g, " "))[0] }; });
  const fmt = v => Math.round(v).toLocaleString("fr-CA").replace(/\s/g, " ") + " $";
  verifier("première année : le solde du 30 avril comprend la prime", r.prime > 0 && r.avril.includes(fmt(r.t + r.prime)), r);
  await remplacer(p, { "revenu.annee": "type" });
  r = await p.evaluate(() => { const R = window.Wealthnord.resultats(), T = window.Wealthnord.outils.tresorerie(R), ev = T.mois.flatMap(m => m.ev);
    return { t: R.impot.total, prime: R.primeMoi, acomptes: ev.filter(([n]) => n === "Acompte provisionnel").map(([, v]) => v), primeSeule: ev.some(([n]) => n === "Prime d'assurance médicaments"),
      ecart: T.mois.reduce((s, x) => s + x.solde, 0) - 12 * R.surplusMoi }; });
  verifier("acomptes : 4 × (impôt + prime) ÷ 4, plus de prime seule en avril", r.acomptes.length === 4 && r.acomptes.every(v => Math.abs(-v - (r.t + r.prime) / 4) < 1e-6) && !r.primeSeule, r);
  verifier("acomptes : trésorerie, année type = 12 × surplus", Math.abs(r.ecart) < 1, r.ecart);
  const celiapp = async c => { await remplacer(p, { "epargne.celiapp": c }); return p.evaluate(() => { const R = window.Wealthnord.resultats(); return [0, 1, 2].map(a => R.celiappAnnee(a)); }); };
  const parSolde = await celiapp({ solde: 30000, cotisationAnnuelle: 8000, cotisationsVersees: null });
  const parCotisations = await celiapp({ solde: 30000, cotisationAnnuelle: 8000, cotisationsVersees: 24000 });
  verifier("CELIAPP : plafond à vie selon le solde, faute de cotisations inscrites", parSolde.join() === "8000,2000,0", parSolde);
  verifier("CELIAPP : plafond à vie selon les cotisations versées", parCotisations.join() === "8000,8000,0", parCotisations);
  verifier("acomptes et CELIAPP : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 24. Finitions : « Aperçu » partout, bouton Données nommé (icône seule sous 360 px), fondu des sous-onglets qui
   débordent, texte de la barre du bas d'au moins 12 px, axe de projection qui ne descend pas d'un pas entier sous zéro. */
async function finitions(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "avenir/projection" });
  const r = await p.evaluate(() => ({
    nav: document.querySelector('.nav [data-onglet="apercu"]').textContent.trim(), titre: document.getElementById("h-apercu").textContent.trim(),
    donnees: getComputedStyle(document.querySelector(".bouton-donnees span")).display, taille: parseFloat(getComputedStyle(document.querySelector(".nav a")).fontSize),
    fondu: document.getElementById("pa-onglets").classList.contains("defile-plus"),
    axe: [...document.querySelectorAll("#v-avenir .graphique .etiquette")].map(t => t.textContent).filter(t => /M\$|k\$|^0 \$$/.test(t)) }));
  verifier("finitions : « Aperçu » dans la navigation et en titre", r.nav === "Aperçu" && r.titre === "Aperçu", r);
  verifier("finitions : bouton Données nommé à 390 px", r.donnees !== "none", r.donnees);
  verifier("finitions : barre du bas en 12 px au moins", r.taille >= 12, r.taille);
  verifier("finitions : fondu des sous-onglets qui débordent", r.fondu);
  verifier("finitions : l'axe de projection ne descend pas à −1 M$", r.axe.length > 0 && !r.axe.some(t => t.startsWith("-") || t.startsWith("−")), r.axe);
  verifier("en-tête : le logo et le nom seuls, les boutons dessous", await p.evaluate(() => !document.querySelector(".barre-haut button, .barre-haut .bouton-icone")
    && !!document.querySelector(".barre-outils [data-bascule-theme]") && !!document.querySelector(".barre-outils .bouton-donnees")));
  verifier("en-tête : Rapport PDF dans l'aperçu seulement", await p.evaluate(() => document.getElementById("barre-pdf").hidden));
  await allerA(p, "apercu");
  verifier("en-tête : Rapport PDF sous le logo, dans l'aperçu", await p.evaluate(() => !document.getElementById("barre-pdf").hidden && getComputedStyle(document.getElementById("rapport-pdf")).display === "none"));
  await p.setViewportSize({ width: 320, height: 700 }); await p.waitForTimeout(200);
  verifier("finitions : icône seule sous 360 px", (await p.evaluate(() => getComputedStyle(document.querySelector(".bouton-donnees span")).display)) === "none");
  verifier("finitions : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 25. En-tête : le logo et le nom sur toute la largeur, les boutons empilés à droite du titre (et du chiffre de
   l'aperçu). Bouton Installer masqué une fois l'app installée. Champ à 0 qui s'efface au toucher. Apprenants :
   résidents et externes sous un même libellé, comptés à part. */
async function enteteEtChamps(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { details: true });
  const m = await p.evaluate(() => {
    const r = s => document.querySelector(s).getBoundingClientRect();
    const marque = r(".barre-haut .marque"), barre = document.querySelector(".barre-outils"), h1 = r("#h-apercu");
    const et = r("#ap-hero .hero-etiquette"), val = r("#ap-hero .hero-valeur"), sous = r("#ap-hero .hero-sous");
    const boutons = [...barre.children].filter(x => getComputedStyle(x).display !== "none").map(x => x.getBoundingClientRect()).sort((a, c) => a.top - c.top);
    return { largeur: Math.round(marque.width), place: innerWidth - 32, vue: barre.parentElement.id, n: boutons.length,
      memeX: boutons.every(x => Math.abs(x.left - boutons[0].left) < 1), empiles: boutons.every((x, i) => !i || x.top >= boutons[i - 1].bottom - 1),
      aDroite: boutons[0].left > h1.right, etUneLigne: et.height < 28 && et.right < boutons[0].left,
      sousPleine: sous.left <= h1.left + 1 && sous.right > boutons[0].right - 1, nombre: val.width > 40 };
  });
  verifier("en-tête : le logo et le nom sur toute la largeur", m.largeur >= m.place - 1, m);
  verifier("en-tête : boutons à droite, libellé sur une ligne, détail en pleine largeur", m.vue === "v-apercu" && m.n >= 3 && m.memeX && m.empiles && m.aDroite && m.etUneLigne && m.sousPleine && m.nombre, m);
  await allerA(p, "revenu");
  verifier("en-tête : les boutons suivent la page ouverte, sans Rapport PDF", await p.evaluate(() => document.querySelector(".barre-outils").parentElement.id === "v-revenu" && document.getElementById("barre-pdf").hidden));
  await allerA(p, "apercu");
  for (const largeur of [320, 360, 430]) {
    await p.setViewportSize({ width: largeur, height: 800 }); await p.waitForTimeout(150);
    verifier(`en-tête : rien ne déborde à ${largeur} px`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll("#v-apercu > *")].every(x => x.getBoundingClientRect().right <= innerWidth - 15)));
  }
  await p.setViewportSize({ width: 1280, height: 900 }); await p.waitForTimeout(150);
  verifier("en-tête : sur ordinateur, ni barre du haut ni boutons empilés", await p.evaluate(() => getComputedStyle(document.querySelector(".barre-outils")).display === "none"
    && getComputedStyle(document.querySelector(".barre-haut")).display === "none" && getComputedStyle(document.getElementById("rapport-pdf")).display !== "none"));
  await p.setViewportSize({ width: 390, height: 844 });
  // Installer
  const installer = () => p.evaluate(() => ({ barre: document.querySelector(".barre-outils [data-installer]").hidden, deja: document.getElementById("installer-deja").hidden,
    carte: document.getElementById("carte-installer").hidden, marque: localStorage.getItem("wm.installee") }));
  let i = await installer();
  verifier("installer : bouton offert dans le navigateur", !i.barre && i.deja && !i.carte, i);
  await p.evaluate(() => localStorage.setItem("wm.installee", "1")); await p.reload(); await pret(p);
  i = await installer();
  verifier("installer : masqué une fois installée ; la page Données le dit et garde de quoi réinstaller", i.barre && !i.deja && !i.carte, i);
  await p.evaluate(() => { const e = new Event("beforeinstallprompt"); e.prompt = () => {}; e.userChoice = Promise.resolve({ outcome: "dismissed" }); window.dispatchEvent(e); });
  i = await installer();
  verifier("installer : de retour si le navigateur propose de nouveau l'installation", !i.barre && i.marque === null, i);
  await p.click(".barre-outils [data-installer]"); await p.waitForTimeout(300);
  await p.click("#feuille-corps .feuille-actions .bouton"); await p.waitForTimeout(200);
  i = await installer();
  verifier("installer : « Elle est déjà installée » masque le bouton (iPhone)", i.barre && i.marque === "1" && !(await p.evaluate(() => document.getElementById("feuille").open)), i);
  // Champ à 0 : s'efface au toucher, « 2 » donne 2 (et non 20) ; laissé vide, il revient à 0.
  await allerA(p, "revenu");
  await p.click("#v-revenu [data-feuille]"); await p.waitForTimeout(300);
  const zero = "#c-revenu-majorationPct";
  await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: "center" }), zero);
  await p.click(zero);
  const vide = await p.evaluate(s => document.querySelector(s).value, zero);
  await p.keyboard.type("2"); await p.waitForTimeout(250);
  const z = await p.evaluate(s => ({ valeur: document.querySelector(s).value, etat: window.Wealthnord.etat().revenu.majorationPct }), zero);
  verifier("champ à 0 : effacé au toucher, « 2 » donne 2", vide === "" && z.valeur === "2" && z.etat === 2, { vide, ...z });
  await p.evaluate(s => { const x = document.querySelector(s); x.value = "0"; x.dispatchEvent(new Event("input", { bubbles: true })); x.blur(); }, zero);
  await p.click(zero); await p.evaluate(s => document.querySelector(s).blur(), zero);
  verifier("champ à 0 : laissé vide, il revient à 0", (await p.evaluate(s => document.querySelector(s).value, zero)) === "0");
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  // Apprenants (GMF-U)
  await remplacer(p, { "revenu.milieu": "gmfu", "revenu.residents": 1, "revenu.externes": 0 });
  await allerA(p, "revenu");
  await p.click("#v-revenu [data-feuille]"); await p.waitForTimeout(300);
  const paire = await p.evaluate(() => { const x = document.querySelector("#feuille-corps .saisie-paire"); const l = x && x.closest(".champ");
    return x && { libelle: l.querySelector("label").textContent, champs: [...x.querySelectorAll("input")].map(i => i.dataset.p), unites: [...x.querySelectorAll(".unite")].map(u => u.textContent),
      aide: l.querySelector(".aide").textContent, ancien: !!document.querySelector('#feuille-corps [data-p="revenu.externes"]:not(.saisie-paire input)') }; });
  verifier("apprenants : résidents et externes sous « Apprenants supervisés »", paire && paire.libelle === "Apprenants supervisés en même temps" && paire.champs.join() === "revenu.residents,revenu.externes"
    && paire.unites.join() === "résidents,externes" && !paire.ancien, paire);
  verifier("apprenants : l'aide dit pourquoi ils restent à part (demi-per diem)", paire && paire.aide.includes("41,45") && paire.aide.includes("49,85"), paire && paire.aide);
  await p.evaluate(() => document.querySelector('#feuille-corps [data-p="revenu.externes"]').scrollIntoView({ block: "center" }));
  await p.fill('#feuille-corps [data-p="revenu.externes"]', "2"); await p.waitForTimeout(250);
  verifier("apprenants : le nombre d'externes est gardé", await p.evaluate(() => window.Wealthnord.etat().revenu.externes === 2));
  verifier("en-tête et champs : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 26. Lien de transfert entre appareils : l'un crée le lien et affiche le code ; l'autre ouvre le lien (ou le colle),
   entre le code, voit ce qu'il reçoit, puis confirme. Mauvais code et lien abîmé refusés ; la charge quitte l'adresse. */
async function transfert(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "donnees" });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
  await remplacer(p, { "revenu.semaines": 41, "budget.0.montant": 1234 });
  await p.click("#transfert-creer"); await p.waitForSelector("#transfert-code-affiche");
  const code = await p.textContent("#transfert-code-affiche");
  await p.click("#feuille-corps .actions .bouton:last-child"); await p.waitForTimeout(150);
  const lien = await p.evaluate(() => navigator.clipboard.readText());
  verifier("transfert : code de 16 caractères, lien avec la charge après #", /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(code) && /^http:\/\/127\.0\.0\.1:\d+\/index\.html#transfert=[A-Za-z0-9_-]{60,}$/.test(lien), { code, taille: lien.length });
  verifier("transfert : les données ne sont pas lisibles dans le lien", !/semaines|revenu|dettes/.test(lien));
  const autre = await ouvrir(b, base, { page: "apercu" });
  await autre.p.goto(lien); await pret(autre.p); await autre.p.waitForSelector("#transfert-code");
  verifier("transfert : la charge quitte l'adresse ; l'autre appareil demande le code", await autre.p.evaluate(() => location.hash === "#apercu" && document.getElementById("feuille-titre").textContent === "Recevoir des données"));
  // Le déchiffrement (600 000 itérations) peut prendre quelques secondes quand la suite charge la machine.
  const messageDe = (q, texte) => q.waitForFunction(t => ((document.querySelector(".transfert-form .message") || {}).textContent || "").includes(t), texte, { timeout: 45000 }).catch(() => {});
  await autre.p.fill("#transfert-code", "AAAA-BBBB-CCCC-DDDD"); await autre.p.click(".transfert-form [type=submit]"); await messageDe(autre.p, "Code incorrect");
  verifier("transfert : mauvais code refusé", (await autre.p.textContent(".transfert-form .message")).includes("Code incorrect"));
  await autre.p.fill("#transfert-code", code.replace(/-/g, "").toLowerCase()); await autre.p.click(".transfert-form [type=submit]");
  await autre.p.waitForSelector("#feuille-corps .bouton.danger", { timeout: 45000 });
  const resume = await autre.p.textContent("#feuille-corps .feuille-intro");
  verifier("transfert : ce qui arrive est décrit avant de remplacer", /^Données du .+ : \d+ dettes?, \d+ dépenses? inscrites?\. Elles remplaceront/.test(resume), resume);
  await autre.p.click("#feuille-corps .bouton.danger"); await autre.p.waitForTimeout(300);
  const recu = await autre.p.evaluate(() => { const S = window.Wealthnord.etat(); return { semaines: S.revenu.semaines, montant: S.budget[0].montant, exemple: S.meta.exemple, feuille: document.getElementById("feuille").open }; });
  verifier("transfert : données remplacées par celles de l'autre appareil", recu.semaines === 41 && recu.montant === 1234 && !recu.exemple && !recu.feuille, recu);
  await autre.ctx.close();
  // Coller le lien dans l'app (iPhone : l'app installée garde ses propres données).
  const troisieme = await ouvrir(b, base, { page: "donnees" });
  await troisieme.p.click("#transfert-recevoir"); await troisieme.p.waitForSelector("#transfert-lien");
  await troisieme.p.fill("#transfert-lien", lien.slice(0, -12)); await troisieme.p.fill("#transfert-code", code); await troisieme.p.click(".transfert-form [type=submit]"); await messageDe(troisieme.p, "incomplet ou abîmé");
  verifier("transfert : lien abîmé refusé", (await troisieme.p.textContent(".transfert-form .message")).includes("incomplet ou abîmé"));
  await troisieme.p.fill("#transfert-lien", `Voici le lien : ${lien}`); await troisieme.p.click(".transfert-form [type=submit]");
  await troisieme.p.waitForSelector("#feuille-corps .bouton.danger", { timeout: 45000 });
  await troisieme.p.click("#feuille-corps .bouton.danger"); await troisieme.p.waitForTimeout(300);
  verifier("transfert : lien collé dans l'app, puis reçu", await troisieme.p.evaluate(() => window.Wealthnord.etat().revenu.semaines === 41));
  verifier("transfert : aucune erreur", erreurs.length + autre.erreurs.length + troisieme.erreurs.length === 0, [...erreurs, ...autre.erreurs, ...troisieme.erreurs]);
  await troisieme.ctx.close(); await ctx.close();
}

/* 27. Résidence : le salaire de l'échelle de la FMRQ jusqu'au début de la pratique, et la bascule Résidence / Pratique.
   En vue résidence, l'aperçu, le revenu, l'impôt, le budget et le rapport montrent la résidence (impôt retenu sur la
   paie) ; en vue pratique, la pratique comme avant. Les projections suivent le parcours dans les deux vues. */
async function residence(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "revenu/detail", horloge: "2026-10-28T10:00:00" });
  verifier("résidence : invitation dans la page Revenu", await p.evaluate(() => !document.getElementById("rv-residence-ajout").hidden));
  await p.click("#rv-residence-ajouter"); await p.waitForTimeout(300);
  const ajout = await p.evaluate(() => { const S = window.Wealthnord.etat(); return { active: S.residence.active, vue: S.residence.vue, date: S.residence.debutPratique, titre: document.getElementById("feuille-titre").textContent }; });
  verifier("résidence : ajoutée, vue Résidence, début de pratique proposé, panneau ouvert", ajout.active && ajout.vue === "residence" && /^\d{4}-07$/.test(ajout.date) && ajout.titre === "Résidence", ajout);
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  const pratique = await p.evaluate(() => { const S = JSON.parse(JSON.stringify(window.Wealthnord.etat())); S.residence.active = false; return S; });
  await remplacer(p, { "strategie.debut": "2026-10", residence: { ...pratique.residence, active: false } });
  const avant = await p.evaluate(() => { const R = window.Wealthnord.resultats(); return { surplus: R.surplusMoi, vn: R.projection[10].moi }; });
  await remplacer(p, { "strategie.debut": "2026-10", residence: { ...pratique.residence, active: true, niveau: "2", debutPratique: "2027-07", vue: "residence", primeGarde: true, primeEnseignement: false, autres: 0, syndicat: 0, scolarite: 1100 } });
  const r = await p.evaluate(() => { const R = window.Wealthnord.resultats(); return { vue: R.vueResidence, brut: R.res.brut, niveau: R.res.niveau, mois: R.moisAvantPratique,
    a0: R.annee(R.hyp, 0).moisResidence, a1: R.annee(R.hyp, 1).moisResidence, vn: R.projection[10].moi, surplus: R.surplusMoi, ae: R.impot.ae }; });
  verifier("résidence : R2 et la prime de garde, 64 880 $ + 9 425 $", r.vue && r.niveau === 2 && r.brut === 74305 && r.ae > 0, r);
  verifier("résidence : 9 mois de résidence, puis la pratique", r.mois === 9 && r.a0 === 9 && r.a1 === 0, r);
  await allerA(p, "apercu");
  const ap = await p.evaluate(() => ({ hero: document.querySelector("#ap-hero .hero-etiquette").textContent, choix: [...document.querySelectorAll("#ap-parcours button")].map(x => x.textContent),
    tuile: document.querySelector("#ap-tuiles .tuile .tuile-valeur").textContent.replace(/\s/g, " "), faire: document.getElementById("ap-actions").textContent,
    echeances: document.getElementById("ap-echeances").textContent }));
  verifier("résidence : l'aperçu montre la résidence, avec la bascule", ap.hero.includes("en résidence") && ap.choix.join() === "Résidence,Pratique" && ap.tuile === "74 305 $", ap);
  const align = await p.evaluate(() => {
    const b = s => document.querySelector(s).getBoundingClientRect();
    const titre = b("#v-apercu > .tete-page"), parcours = b("#ap-parcours"), pdf = b("#barre-pdf");
    return { titre: Math.round(titre.width), parcours: Math.round(parcours.width), ecartHaut: Math.round(pdf.top - parcours.top), pdfX: Math.round(pdf.left), parcoursD: Math.round(parcours.right) };
  });
  verifier("résidence : le titre a la largeur de la bascule, et les boutons partent à sa hauteur", Math.abs(align.titre - align.parcours) <= 2 && align.ecartHaut >= -2 && align.ecartHaut <= 8 && align.pdfX >= align.parcoursD - 2, align);
  verifier("résidence : impôt retenu sur la paie, ni acompte ni alerte de la RAMQ", ap.faire.includes("retenus sur chaque paie") && !ap.faire.includes("paiement de la RAMQ") && !ap.echeances.includes("Acompte provisionnel")
    && ap.echeances.includes("Début de la pratique"), ap.echeances);
  await allerA(p, "revenu");
  const rv = await p.evaluate(() => ({ carte: !document.getElementById("rv-residence").hidden, pratique: [...document.querySelectorAll("#v-revenu .pratique-seule")].every(x => x.hidden),
    detail: document.getElementById("rv-residence-detail").textContent, invitation: document.getElementById("rv-residence-ajout").hidden }));
  verifier("résidence : la page Revenu montre le salaire et cache la pratique", rv.carte && rv.pratique && rv.invitation && rv.detail.includes("Salaire de l'échelle, R2") && rv.detail.includes("Début de la pratique"), rv);
  const rvr = await p.evaluate(() => ({ tuiles: [...document.querySelectorAll("#rv-r-tuiles .tuile-titre")].map(x => x.textContent), niveau: document.querySelector("#rv-r-tuiles .tuile:nth-child(3) .tuile-valeur").textContent,
    cartes: [...document.querySelectorAll("#v-revenu .resume-seul")].filter(x => x.getClientRects().length).map(x => x.id || x.className) }));
  verifier("résidence : le résumé du Revenu montre la paie et le niveau, pas la pratique", rvr.tuiles.join() === "Net par mois,Par paie,Niveau,Début de la pratique" && rvr.niveau === "R2"
    && !rvr.cartes.includes("rv-r-sources") && !rvr.cartes.includes("rv-r-sens"), rvr);
  await allerA(p, "impot");
  const im = await p.evaluate(() => ({ titre: document.getElementById("im-acomptes-titre").textContent, tableau: document.getElementById("im-tableau").textContent,
    societe: document.getElementById("im-societe").closest(".carte").hidden }));
  verifier("résidence : l'impôt d'un salarié, retenu sur la paie", im.titre === "Retenues sur la paie" && im.tableau.includes("Assurance-emploi") && im.tableau.includes("scolarité") && im.societe, im);
  const imr = await p.evaluate(() => ({ tuiles: [...document.querySelectorAll("#im-r-tuiles .tuile-titre")].map(x => x.textContent), paie: document.getElementById("im-r-payer").textContent }));
  verifier("résidence : le résumé de l'impôt, sans chiffre répété, et la paie type", imr.tuiles.join() === "Net de l'année,Impôt fédéral,Impôt du Québec,Cotisations"
    && ["Paie brute", "Impôt et cotisations retenus", "Paie nette"].every(t => imr.paie.includes(t)), imr);
  const tresorerie = await p.evaluate(() => window.Wealthnord.outils.tresorerie(window.Wealthnord.resultats()).mois.flatMap(m => m.ev.map(([n]) => n)));
  verifier("résidence : trésorerie sans acompte", !tresorerie.includes("Acompte provisionnel"), tresorerie);
  const rapport = await p.evaluate(() => { const W = window.Wealthnord.rapport, boite = document.getElementById("rapport");
    W.construire(); const t = boite.textContent; W.construire({ comptable: true }); const c = boite.textContent; boite.textContent = ""; return { t, c }; });
  verifier("résidence : le rapport et le sommaire du comptable", rapport.t.includes("Revenu · résidence") && rapport.t.includes("Retenu par paie") && rapport.c.includes("T4") && rapport.c.includes("T2202"));
  // La bascule : la pratique, comme sans résidence ; les projections ne changent pas d'une vue à l'autre.
  await allerA(p, "apercu");
  await p.click('#ap-parcours button[data-v="pratique"]'); await p.waitForTimeout(300);
  const q = await p.evaluate(() => { const R = window.Wealthnord.resultats(); return { vue: R.vueResidence, surplus: R.surplusMoi, vn: R.projection[10].moi, hero: document.querySelector("#ap-hero .hero-etiquette").textContent }; });
  verifier("bascule : la vue Pratique, comme sans résidence", !q.vue && Math.abs(q.surplus - avant.surplus) < 0.01 && q.hero.includes("en pratique"), { q, avant });
  verifier("bascule : mêmes projections dans les deux vues ; la résidence les change", Math.abs(q.vn - r.vn) < 0.01 && r.vn < avant.vn, { pratique: q.vn, residence: r.vn, sans: avant.vn });
  const prem = await p.evaluate(() => ({ ech: [...document.querySelectorAll("#ap-echeances .rangee")].map(x => x.textContent.replace(/\s+/g, " ")),
    impot: document.getElementById("im-acomptes").textContent.replace(/\s+/g, " "),
    treso: window.Wealthnord.outils.tresorerie(window.Wealthnord.resultats()).mois.flatMap(m => m.ev.map(([n]) => `${m.date.getFullYear()} ${n}`)).filter(x => /Acompte|Solde/.test(x)) }));
  verifier("bascule : première année de pratique en 2027, solde le 30 avril 2028, aucun acompte en 2027", prem.ech.some(x => /^30avrSolde de l'impôt.*2028$/.test(x))
    && !prem.ech.some(x => /Acompte/.test(x) && x.endsWith("2027")) && prem.impot.includes("30 avril 2028") && prem.treso.length === 0, prem);
  const comptable = await p.evaluate(() => { const boite = document.getElementById("rapport"); window.print = () => {};
    document.querySelector("[data-comptable]").click(); const t = boite.textContent; boite.textContent = ""; document.body.classList.remove("impression-rapport");
    return { t, vue: window.Wealthnord.resultats().vueResidence, choix: window.Wealthnord.etat().residence.vue }; });
  verifier("bascule : le sommaire du comptable décrit l'année en résidence, et la vue Pratique reste choisie", comptable.t.includes("salarié") && comptable.t.includes("T4") && !comptable.vue && comptable.choix === "pratique", { vue: comptable.vue, choix: comptable.choix });
  verifier("résidence : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 28. Résumé et détail : chaque page s'ouvre sur son résumé, quelques cartes d'un chiffre chacune ; « Voir tout le détail »
   montre la page complète, et « Résumé » ou le bouton Retour y ramènent. Mêmes chiffres dans les deux. Sur ordinateur,
   les cartes côte à côte ont la même hauteur et toutes les pages, la même largeur. */
async function resumeDetail(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base);
  // Ce qui se voit : les cartes du résumé ou celles du détail, jamais les deux.
  const vus = pg => p.evaluate(pg => {
    const v = document.getElementById("v-" + pg), vu = x => x.getClientRects().length > 0;
    return { detail: v.classList.contains("mode-detail"), resume: [...v.querySelectorAll(".resume-seul")].filter(vu).length,
      details: [...v.querySelectorAll(".detail-seul")].filter(vu).length, hauteur: document.documentElement.scrollHeight, adresse: location.hash };
  }, pg);
  for (const pg of ["apercu", "revenu", "impot", "budget", "avenir"]) {
    await allerA(p, pg);
    const r = await vus(pg);
    verifier(`résumé : ${pg} s'ouvre sur son résumé`, !r.detail && r.resume >= 3 && r.details === 0 && r.adresse === "#" + pg, r);
    await p.click(`#v-${pg} .bouton-detail`); await p.waitForTimeout(250);
    const d = await vus(pg);
    verifier(`détail : ${pg} montre tout, sans le résumé`, d.detail && d.resume === 0 && d.details >= 3 && d.adresse.startsWith(`#${pg}/`), d);
    // Budget : le détail du mois replie le bilan et les catégories vides, il reste donc proche du résumé.
    const plafond = pg === "budget" ? 1 : 0.75;
    verifier(`résumé : ${pg} tient en moins de place que le détail`, r.hauteur < d.hauteur * plafond, { resume: r.hauteur, detail: d.hauteur });
    await p.click(`#v-${pg} .retour-resume`); await p.waitForTimeout(250);
    const retour = await vus(pg);
    verifier(`résumé : « Résumé » ramène au résumé de ${pg}`, !retour.detail && retour.details === 0 && retour.adresse === "#" + pg, retour);
  }
  // Les tuiles du résumé : quatre, chacune avec sa valeur.
  const tuiles = await p.evaluate(() => ["rv-r-tuiles", "im-r-tuiles", "bu-r-tuiles", "pa-r-tuiles"].map(id =>
    [...document.querySelectorAll(`#${id} .tuile`)].filter(t => t.querySelector(".tuile-valeur").textContent.trim()).length));
  verifier("résumé : quatre tuiles remplies par page", tuiles.every(n => n === 4), tuiles);
  // Aperçu : les 3 actions les plus importantes, tirées de la liste complète ; ce mois-ci, les montants du détail.
  const ap = await p.evaluate(() => {
    const textes = sel => [...document.querySelectorAll(sel)].map(x => x.textContent.replace(/\s/g, " "));
    return { resume: textes("#ap-r-actions li"), tout: textes("#ap-actions li"), importants: textes("#ap-actions li .ico.important + span"),
      lien: (document.querySelector("#ap-r-actions .lien-carte") || {}).textContent || "", mois: textes("#ap-r-mois .legende-cases strong"),
      flux: document.getElementById("ap-flux").textContent.replace(/\s/g, " "), avenir: document.querySelectorAll("#ap-r-avenir .rangee").length };
  });
  verifier("résumé : trois actions, les importantes d'abord", ap.resume.length === Math.min(3, ap.tout.length) && ap.resume.every(t => ap.tout.includes(t))
    && ap.resume.slice(0, Math.min(3, ap.importants.length)).every(t => ap.importants.includes(t)), ap);
  verifier("résumé : « Tout voir » compte toutes les actions", ap.tout.length <= 3 || ap.lien === `Tout voir (${ap.tout.length})`, ap.lien);
  verifier("résumé : ce mois-ci, les montants du détail ; la prochaine échéance et le prochain jalon", ap.mois.length === 4 && ap.mois.every(m => ap.flux.includes(m)) && ap.avenir === 2, ap);
  // Impôt : chaque 100 $ se partage en entier ; Budget : le total des dettes.
  const chiffres = await p.evaluate(() => {
    const n = t => +t.replace(/[^\d,-]/g, "").replace(",", ".");
    const cent = [...document.querySelectorAll("#im-r-cent .legende-cases strong")].reduce((t, x) => t + n(x.textContent), 0);
    const dettes = document.querySelector("#bu-r-dettes .rangee-valeur");
    return { cent, dettes: dettes ? n(dettes.textContent) : null, total: Math.round(window.Wealthnord.resultats().detteTotale) };
  });
  verifier("résumé : chaque 100 $ gagnés se partage en entier", Math.abs(chiffres.cent - 100) < 0.1, chiffres.cent);
  verifier("résumé : le total des dettes", chiffres.dettes === chiffres.total, chiffres);
  // Un lien du résumé ouvre le bon sous-onglet ; le bouton Retour revient au résumé.
  await allerA(p, "budget");
  await p.click("#bu-r-dettes .lien-carte"); await p.waitForTimeout(250);
  const plan = await p.evaluate(() => ({ adresse: location.hash, cartes: [...document.querySelectorAll("#v-budget .carte[data-sous]")].filter(c => c.getClientRects().length).map(c => c.dataset.sous) }));
  verifier("résumé : « Plan » ouvre les dettes", plan.adresse === "#budget/dettes" && plan.cartes.length > 0 && plan.cartes.every(c => c === "dettes"), plan);
  await p.goBack(); await p.waitForTimeout(250);
  const arriere = await vus("budget");
  verifier("résumé : le bouton Retour revient au résumé", !arriere.detail && arriere.adresse === "#budget", arriere);
  // Clavier : le focus suit (le lien touché disparaît) ; le lien d'évitement ne change pas de page. Le détail du Budget
  // rouvre le sous-onglet gardé (Dettes, choisi plus haut).
  await p.focus("#v-budget .bouton-detail"); await p.keyboard.press("Enter"); await p.waitForTimeout(250);
  verifier("clavier : « Voir tout le détail » mène le focus au contenu", await p.evaluate(() => location.hash === "#budget/dettes" && document.activeElement.id === "contenu"));
  await p.focus(".saut"); await p.keyboard.press("Enter"); await p.waitForTimeout(250);
  verifier("clavier : « Aller au contenu » reste sur la page", await p.evaluate(() => location.hash === "#budget/dettes" && document.activeElement.id === "contenu" && !document.getElementById("v-budget").hidden));
  await allerA(p, "apercu");
  verifier("aperçu : la tuile Dettes ouvre le plan", !!(await p.$('#ap-tuiles a.tuile[href="#budget/dettes"]')));
  // Données : toujours en entier ; les cartes moins utiles, repliées, leur conclusion en vue.
  await allerA(p, "donnees");
  const don = await p.evaluate(() => ({ adresse: location.hash, retour: document.querySelectorAll("#v-donnees .retour-resume").length,
    cartes: [...document.querySelectorAll("#v-donnees details.carte-repliable")].map(d => ({ ouvert: d.open, resume: d.querySelector(".repli-resume").textContent })) }));
  verifier("données : quatre cartes repliées, leur conclusion en vue", don.adresse === "#donnees" && don.retour === 0 && don.cartes.length === 4
    && don.cartes.every(c => !c.ouvert && c.resume.length > 3) && /^\d+ sur \d+$/.test(don.cartes[1].resume), don);
  await p.click("#v-donnees details.carte-repliable:nth-of-type(3) > summary"); await p.waitForTimeout(150);
  verifier("données : une carte s'ouvre au toucher", await p.evaluate(() => document.getElementById("theme-choix").getClientRects().length > 0));
  // Ordinateur : les cartes côte à côte, de même hauteur ; la même largeur sur chaque page.
  await p.setViewportSize({ width: 1280, height: 900 });
  const largeurs = [], paires = {};
  for (const [pg, a, c] of [["apercu", "ap-r-actions", "ap-r-avenir"], ["revenu", "rv-r-sources", "rv-r-sens"], ["impot", "im-r-cent", "im-r-payer"], ["budget", "bu-r-dettes", "bu-r-annee"]]) {
    await allerA(p, pg);
    const m = await p.evaluate(([a, c]) => { const x = document.getElementById(a).getBoundingClientRect(), y = document.getElementById(c).getBoundingClientRect();
      return { haut: Math.abs(x.top - y.top), hauteur: Math.abs(x.height - y.height), cote: y.left > x.right, main: document.querySelector("main").getBoundingClientRect().width }; }, [a, c]);
    paires[pg] = m; largeurs.push(m.main);
  }
  verifier("ordinateur : les cartes côte à côte ont la même hauteur", Object.values(paires).every(m => m.cote && m.haut < 1 && m.hauteur < 1), paires);
  verifier("ordinateur : la même largeur sur chaque page", largeurs.every(l => Math.abs(l - largeurs[0]) < 1), largeurs);
  verifier("résumé et détail : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 29. Le temps passe : plan commencé en octobre 2026, en résidence jusqu'en juillet 2027. Le plan avance avec le
   calendrier ; le délai jusqu'à la pratique se compte depuis aujourd'hui. En août 2027, la résidence est terminée ;
   si l'on a refusé d'avancer le plan ce mois-ci, « À faire » le rappelle. */
async function tempsQuiPasse(b, base) {
  const lire = async (horloge, refus) => {
    const { ctx, p, erreurs } = await ouvrir(b, base, { page: "revenu", horloge });
    await remplacer(p, { "strategie.debut": "2026-10", "residence.active": true, "residence.niveau": "2", "residence.debutPratique": "2027-07", "residence.vue": "residence",
      "meta.planRefuse": refus || "" });
    const o = await p.evaluate(() => { const S = window.Wealthnord.etat(), t = document.querySelector("#rv-r-tuiles .tuile:nth-child(4) .tuile-sous");
      return { tuile: t && t.textContent, faire: document.getElementById("ap-actions").textContent, debut: S.strategie.debut, active: S.residence.active, niveau: S.residence.niveau,
        annee: S.revenu.annee, anneePremiere: S.revenu.anneePremiere, toast: document.getElementById("toast").hidden ? "" : document.getElementById("toast-texte").textContent,
        ech: [...document.querySelectorAll("#ap-echeances .rangee")].map(x => x.textContent.replace(/\s+/g, " ")) }; });
    await ctx.close(); return { ...o, erreurs };
  };
  const janvier = await lire("2027-01-15T10:00:00"), aout = await lire("2027-08-02T10:00:00"), refus = await lire("2027-08-02T10:00:00", "2027-08");
  verifier("temps : en janvier 2027, le plan part de janvier ; la pratique dans 6 mois", janvier.debut === "2027-01" && janvier.tuile === "dans 6 mois"
    && janvier.faire.includes("Début de la pratique en juillet 2027, dans 6 mois"), janvier);
  verifier("temps : en août 2027, la résidence est terminée (R3 au 1er juillet) ; première année de pratique : 2027", aout.debut === "2027-08" && !aout.active && aout.niveau === "3"
    && aout.annee === "premiere" && aout.anneePremiere === 2027 && aout.toast.includes("votre pratique a commencé, la résidence est terminée"), aout);
  verifier("temps : le solde de la première année, le 30 avril 2028", aout.ech.some(x => /^30avrSolde de l'impôt.*2028$/.test(x)), aout.ech);
  verifier("temps : plan gardé en résidence ce mois-ci, et le rappel", refus.debut === "2026-10" && refus.tuile === "déjà commencée" && refus.faire.includes("Votre pratique a commencé en juillet 2027"), refus);
  verifier("temps : aucune erreur", [janvier, aout, refus].every(x => x.erreurs.length === 0), [...janvier.erreurs, ...aout.erreurs, ...refus.erreurs]);
}

/* 31. Comparer les actes (Revenu, sous-onglet, GMF-U seulement) : supervision ou visites des apprenants,
   choix appliqué au plan ; durée d'un acte ; ma demi-journée, puis celle du plan ; carte du résumé ;
   seuils de rémunération ; hors GMF-U, la section disparaît. Aucun débordement. */
async function comparerActes(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "revenu" });
  await remplacer(p, { "revenu.milieu": "gmfu", "revenu.lieuTarifs": "auto", "revenu.modeBudget": "mixte", "revenu.residents": 1, "revenu.externes": 1, "revenu.patientsParResident": 4.5,
    "revenu.patientsParExterne": 2.5, "revenu.heuresParDJ": 3.5, "revenu.enseignement": 2, "revenu.enseignementApresMidi": 0, "revenu.demiJournees": 8, "revenu.semaines": 40,
    "revenu.annee": "type", "revenu.inscritsDebut": 600, "revenu.patientsPendantSupervision": 0, "revenu.supervisionFacturation": "visites", "revenu.patientsParDJ": 6,
    "revenu.mix": { suivi: 100, suiviV: 0, perioV: 0, pedia: 0, gross: 0 } });
  await allerA(p, "revenu/actes");
  const vue = await p.evaluate(() => ({ hash: location.hash, onglets: [...document.querySelectorAll("#rv-onglets button")].map(x => x.textContent),
    visibles: [...document.querySelectorAll("#v-revenu .carte")].filter(c => c.offsetParent).map(c => c.id), conclusion: document.getElementById("rv-sup-conclusion").textContent,
    bouton: (document.querySelector("#rv-sup-actions button") || {}).textContent || "", debord: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
  verifier("actes : le sous-onglet de Revenu : les seuils, la supervision, la demi-journée ; les actes et la CNESST repliés", vue.hash === "#revenu/actes" && vue.onglets.join() === "Votre revenu,Comparer les actes"
    && vue.visibles.join() === "rv-carte-seuils,rv-carte-supervision,rv-carte-demijournee,rv-carte-actes,rv-carte-cnesst" && !vue.debord
    && await p.evaluate(() => !document.getElementById("rv-carte-actes").open && !document.getElementById("rv-carte-cnesst").open && !document.getElementById("rv-sup-plus").open), vue);
  verifier("actes : la supervision rapporte 51,94 $ de plus, environ 4 156 $ sur 80 demi-journées ; les visites dès 10", vue.conclusion.includes("51,94") && vue.conclusion.replace(/\s/g, " ").includes("4 156")
    && vue.conclusion.includes("80 demi-journées") && vue.conclusion.includes("dès 10 visites"), vue.conclusion);
  await p.click("#rv-sup-actions button"); await p.waitForTimeout(300);
  verifier("actes : le bouton applique l'intervention de supervision au plan", vue.bouton === "Facturer l'intervention de supervision"
    && await p.evaluate(() => window.Wealthnord.etat().revenu.supervisionFacturation === "acte"), vue.bouton);
  await p.click("#rv-carte-actes > summary"); await p.fill("#duree-suivi", "20"); await p.waitForTimeout(400);
  const duree = await p.evaluate(() => ({ s: window.Wealthnord.etat().revenu.dureesActes.suivi, acte: document.querySelector('#rv-actes-heure tr[data-acte="suivi"] td[data-m="acte"]').textContent }));
  verifier("actes : la durée d'un suivi change ce qu'il rapporte à l'heure", duree.s === 20 && duree.acte.replace(/\s/g, "") === "111$", duree);
  await p.click("#rv-dj-plus > summary"); await p.fill("#rapide-suivi", "6"); await p.waitForTimeout(400);
  const dj = await p.evaluate(() => ({ t: window.Wealthnord.etat().revenu.demiJourneeType, plan: !document.getElementById("rv-dj-plan").hidden, c: document.getElementById("rv-dj-conclusion").textContent }));
  verifier("actes : ma demi-journée se garde, avec les autres actes ; « Selon mon plan » apparaît", dj.t && dj.t.suivi === 6 && "perioV" in dj.t && dj.plan && dj.c.includes("rapporte le plus"), dj);
  await p.click("#rv-dj-plan"); await p.waitForTimeout(300);
  verifier("actes : « Selon mon plan » revient à la demi-journée du plan", await p.evaluate(() => window.Wealthnord.etat().revenu.demiJourneeType === null));
  const seuils = await p.evaluate(() => document.getElementById("rv-carte-seuils").textContent);
  verifier("seuils : en tête du sous-onglet, dès tant de patients le mixte, puis l'acte ; dès tant de visites la supervision ; l'année aussi",
    seuils.includes("Quand changer de mode") && seuils.includes("patients par demi-journée") && seuils.includes("Mixte plutôt que l'horaire") && seuils.includes("L'acte plutôt que le mixte")
    && seuils.includes("Visites plutôt que la supervision") && seuils.includes("Dès 6") && seuils.includes("Dès 16") && seuils.includes("Dès 10") && !/Dès [3-9]\d/.test(seuils)
    && seuils.includes("3 résidents") && seuils.includes("4,5") && seuils.includes("Sur l'année") && seuils.includes("Comment ces seuils sont calculés"), seuils);
  await allerA(p, "revenu"); await p.waitForTimeout(200);
  const resume = await p.evaluate(() => {
    const c = document.getElementById("rv-r-modes"), hero = document.getElementById("rv-hero"), sources = document.getElementById("rv-r-sources");
    return { lien: c.querySelector("a.lien-carte").getAttribute("href"), texte: c.textContent, vu: !!c.offsetParent, choisis: c.querySelectorAll(".rangee.choisi").length,
      lignes: c.querySelectorAll(".rangee").length, sousLeChiffre: c.getBoundingClientRect().top > hero.getBoundingClientRect().top,
      avantLeReste: !sources.offsetParent || c.getBoundingClientRect().top < sources.getBoundingClientRect().top, puce: hero.textContent,
      anciennes: !!document.getElementById("rv-r-seuils") || !!document.getElementById("rv-r-actes"),
      debord: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  verifier("résumé : une seule carte « Vos trois modes », sous le chiffre, le meilleur net en évidence ; elle mène aux seuils et aux actes",
    resume.vu && resume.lien === "#revenu/actes" && resume.texte.includes("Vos trois modes") && resume.texte.includes("net par année") && resume.texte.includes("rapporte le plus")
    && resume.lignes === 3 && resume.choisis === 1 && resume.sousLeChiffre && resume.avantLeReste && !resume.anciennes && !resume.debord, resume);
  verifier("résumé : le chiffre du haut compare le net, comme la carte", resume.puce.includes("net par rapport"), resume.puce);
  await allerA(p, "revenu/detail");
  verifier("actes : « Voir tout le détail » garde le détail du revenu", await p.evaluate(() => !document.getElementById("rv-carte-supervision").offsetParent && !!document.getElementById("rv-carte-source").offsetParent
    && document.getElementById("rv-seuil").textContent.includes("dès") && document.getElementById("rv-seuil").textContent.includes("forfait de responsabilité")));
  await remplacer(p, { "revenu.milieu": "clsc" });
  await allerA(p, "revenu/actes");
  const clsc = await p.evaluate(() => ({ hash: location.hash, onglet: !document.getElementById("rv-onglets").hidden, seuils: !!document.getElementById("rv-carte-seuils").offsetParent,
    sup: !!document.getElementById("rv-carte-supervision").offsetParent, texte: document.getElementById("rv-carte-seuils").textContent,
    debord: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
  verifier("seuils : en CLSC, le sous-onglet et les seuils, sans la supervision", clsc.hash === "#revenu/actes" && clsc.onglet && clsc.seuils && !clsc.sup && !clsc.debord
    && clsc.texte.includes("patients par demi-journée") && clsc.texte.includes("Dès") && !clsc.texte.includes("Visites plutôt que la supervision"), clsc);
  await remplacer(p, { "revenu.milieu": "clinique" });
  await allerA(p, "revenu/actes");
  const clinique = await p.evaluate(() => ({ hash: location.hash, modes: document.getElementById("rv-r-modes").hidden,
    onglet: document.getElementById("rv-onglets").hidden, sup: !!document.getElementById("rv-carte-supervision").offsetParent }));
  verifier("actes : en clinique, à l'acte seulement, ni le sous-onglet ni la carte des modes", clinique.hash === "#revenu/detail" && clinique.modes && clinique.onglet && !clinique.sup, clinique);
  verifier("actes : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 32. Outils avancés : cachés par défaut ; le lien au bas de la page dit lesquels et les montre ; le choix est gardé,
   et l'interrupteur de la page Données le reflète. Rien n'est retiré. */
async function outilsAvances(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "avenir/projection", avance: false });
  const avant = await p.evaluate(() => { const z = document.querySelector("#v-avenir > .plus-outils");
    return { proba: !!document.querySelector("#pa-proba, #v-avenir .avance h2") && [...document.querySelectorAll("#v-avenir .avance")].every(c => !c.offsetParent),
      lien: z && !!z.offsetParent && z.textContent, debord: document.documentElement.scrollWidth > document.documentElement.clientWidth }; });
  verifier("avancés : cachés par défaut ; le lien les nomme", avant.proba && avant.lien && avant.lien.includes("Afficher les outils avancés") && avant.lien.includes("Probabilité de réussite") && !avant.debord, avant);
  await p.click("#v-avenir > .plus-outils button"); await p.waitForTimeout(250);
  const apres = await p.evaluate(() => ({ vus: [...document.querySelectorAll("#v-avenir .avance")].filter(c => !c.classList.contains("hors-onglet")).every(c => !!c.offsetParent),
    pref: localStorage.getItem("wm.avance"), texte: document.querySelector("#v-avenir > .plus-outils button").textContent }));
  verifier("avancés : un toucher les montre, et le choix est gardé", apres.vus && apres.pref === "1" && apres.texte === "Masquer les outils avancés", apres);
  await p.reload(); await pret(p); await allerA(p, "donnees");
  verifier("avancés : après un rechargement, toujours là ; l'interrupteur de Données le dit", await p.evaluate(() => document.documentElement.classList.contains("outils-avances") && document.getElementById("outils-avances").checked));
  await p.evaluate(() => { const c = document.getElementById("outils-avances"); c.closest("details").open = true; });
  await p.click("#outils-avances"); await p.waitForTimeout(200);
  verifier("avancés : l'interrupteur les cache de nouveau", await p.evaluate(() => !document.documentElement.classList.contains("outils-avances") && localStorage.getItem("wm.avance") === "0"));
  verifier("avancés : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 33. « Et si… » dans Vos trois modes : + et − changent les nets en direct, sans toucher au plan ; « Garder ces valeurs »
   l'applique ; « Revenir à mon plan » l'annule. Le focus reste sur le bouton touché. */
async function etSi(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "revenu" });
  await remplacer(p, { "revenu.milieu": "gmfu", "revenu.modeBudget": "mixte", "revenu.lieuTarifs": "auto", "revenu.patientsParDJ": 6, "revenu.demiJournees": 8, "revenu.enseignement": 2 });
  const nets = () => p.evaluate(() => [...document.querySelectorAll("#rv-r-modes .rangee .rangee-valeur")].map(x => +x.textContent.replace(/[^\d]/g, "")));
  const avant = await nets();
  await p.click("#essai-pat-plus"); await p.click("#essai-pat-plus"); await p.waitForTimeout(150);
  const apres = await nets(), etat = await p.evaluate(() => ({ plan: window.Wealthnord.etat().revenu.patientsParDJ, focus: document.activeElement && document.activeElement.id,
    statut: document.querySelector("#rv-r-modes .essai-statut").textContent, valeur: document.querySelector("#rv-r-modes .essai-valeur").textContent }));
  verifier("et si : deux patients de plus font monter le mixte et l'acte, pas le plan", apres[1] > avant[1] && apres[2] > avant[2] && etat.plan === 6 && etat.valeur === "8"
    && etat.focus === "essai-pat-plus" && etat.statut.includes("Votre plan : 6"), { avant, apres, etat });
  await p.click("#rv-r-modes .essai .actions .bouton.secondaire"); await p.waitForTimeout(150);
  verifier("et si : Revenir à mon plan", (await nets()).join() === avant.join());
  await p.click("#essai-dj-plus"); await p.waitForTimeout(100);
  await p.click("#rv-r-modes .essai .actions .bouton:not(.secondaire)"); await p.waitForTimeout(200);
  verifier("et si : Garder ces valeurs met le plan à jour", await p.evaluate(() => window.Wealthnord.etat().revenu.demiJournees === 9 && !document.querySelector("#rv-r-modes .essai .actions")));
  const heure = await p.evaluate(() => { const R = window.Wealthnord.resultats(), g = R.rev;
    return { app: R.parHeure.mixte, attendu: (g.mixte.total - g.activites - g.polyvalence - g.mixte.autres - g.mixte.fraisCabinet) / g.heures,
      horaire: R.parHeure.horaire, texte: document.getElementById("rv-r-modes").textContent }; });
  verifier("à l'heure : par heure en clinique, après frais ; au taux horaire, au moins le tarif horaire", Math.abs(heure.app - heure.attendu) < 1e-6 && heure.horaire >= 99
    && heure.texte.includes("/h") && heure.texte.includes("par heure en clinique"), heure);
  verifier("et si : rien ne déborde ; aucune erreur", !(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) && erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 34. Comparer deux offres : votre plan et une autre pratique côte à côte ; la même offre que le plan donne le même net ;
   les réglages se gardent ; on peut la retirer. */
async function deuxOffres(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "revenu/detail" });
  await remplacer(p, {});
  const pareil = await p.evaluate(() => { const R = window.Wealthnord.resultats(), S = window.Wealthnord.etat(), r = S.revenu;
    const o = R.offre({ milieu: r.milieu, mode: R.mode, demiJournees: r.demiJournees, patientsParDJ: r.patientsParDJ, semaines: r.semaines, heuresParDJ: r.heuresParDJ, fraisCabinetPct: r.fraisCabinetPct, activites: true });
    return { offre: o.net, plan: R.nets[R.mode], brut: o.brut, brutPlan: R.rev[R.mode].total }; });
  verifier("offres : la même pratique que le plan donne le même brut et le même net", Math.abs(pareil.offre - pareil.plan) < 1 && Math.abs(pareil.brut - pareil.brutPlan) < 1, pareil);
  await p.click("#rv-offre-ajouter"); await p.waitForTimeout(250);
  const vue = await p.evaluate(() => ({ lignes: document.querySelectorAll("#rv-offre-table tbody tr").length, conclusion: document.getElementById("rv-offre-conclusion").textContent,
    offre: window.Wealthnord.etat().revenu.offreB, ouvert: document.getElementById("rv-offre-plus").open, debord: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
  verifier("offres : l'autre offre (GMF-U, au mixte) à côté du plan, avec sa conclusion", vue.lignes === 5 && vue.offre && vue.offre.milieu === "gmfu" && vue.offre.mode === "mixte"
    && /net de plus par année/.test(vue.conclusion) && vue.ouvert && !vue.debord, vue);
  await p.selectOption("#rapide-revenu-offreB-milieu", "clsc"); await p.waitForTimeout(250);
  await p.fill("#rapide-revenu-offreB-patientsParDJ", "9"); await p.waitForTimeout(300);
  const regle = await p.evaluate(() => ({ o: window.Wealthnord.etat().revenu.offreB, focus: document.activeElement && document.activeElement.id, nom: document.querySelector("#rv-offre-table tbody tr td:nth-child(3)").textContent }));
  verifier("offres : les réglages se gardent, le focus reste dans le champ", regle.o.milieu === "clsc" && regle.o.patientsParDJ === 9 && regle.focus === "rapide-revenu-offreB-patientsParDJ" && regle.nom.startsWith("CLSC"), regle);
  await p.click("#rv-offre-plus .actions .bouton"); await p.waitForTimeout(200);
  verifier("offres : on peut la retirer", await p.evaluate(() => window.Wealthnord.etat().revenu.offreB === null && !document.getElementById("rv-offre-vide").hidden));
  verifier("offres : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 35. Démarrage en trois questions : le milieu, les demi-journées, les patients ; puis vos trois modes. Le portrait
   complet reste à faire (carte de l'aperçu), et le retour ramène à l'accueil. */
async function demarrageRapide(b, base) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const p = await ctx.newPage(), erreurs = [];
  p.on("pageerror", e => erreurs.push(String(e)));
  await ctx.addInitScript(() => { try { sessionStorage.setItem("wm.ouverture", "1"); } catch (e) { /* stockage indisponible */ } });
  await p.goto(`${base}/index.html`); await pret(p);
  await p.waitForSelector("#assistant[open]", { timeout: 5000 });
  await p.click("#as-rapide");
  const q1 = await p.evaluate(() => ({ etape: document.querySelector("#as-corps .as-etape").textContent, titre: document.getElementById("as-titre").textContent, retour: !document.getElementById("as-retour").hidden }));
  await p.click("#as-retour");
  const accueil = await p.evaluate(() => document.getElementById("as-titre").textContent);
  await p.click("#as-rapide");
  await p.check('input[name="as-milieu"][value="gmfu"]'); await p.click("#as-suivant");
  const q2 = await p.evaluate(() => ({ etape: document.querySelector("#as-corps .as-etape").textContent, bouton: document.getElementById("as-suivant").textContent }));
  await p.fill("#as-patientsParDJ", "8"); await p.click("#as-suivant"); await p.waitForTimeout(400);
  const fin = await p.evaluate(() => ({ hash: location.hash, modes: !!document.getElementById("rv-r-modes").offsetParent, S: window.Wealthnord.etat(),
    toast: document.getElementById("toast-texte").textContent }));
  verifier("rapide : trois questions, puis vos trois modes", q1.etape === "Question 1 sur 2" && q1.titre === "Votre pratique" && q1.retour && accueil === "Bienvenue dans WealthMorand"
    && q2.etape === "Question 2 sur 2" && q2.bouton === "Voir mes modes" && fin.hash === "#revenu" && fin.modes && fin.S.revenu.milieu === "gmfu" && fin.S.revenu.patientsParDJ === 8
    && fin.toast.includes("Complétez votre portrait"), { q1, accueil, q2, hash: fin.hash, toast: fin.toast });
  await allerA(p, "apercu/detail");
  verifier("rapide : le portrait complet reste à faire", fin.S.meta.portraitRapide === true && await p.evaluate(() => !document.getElementById("ap-portrait").hidden
    && document.getElementById("ap-portrait-titre").textContent !== "Votre portrait : 100 % complété"));
  verifier("rapide : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 36. Import sûr : un âge d'enfant hors borne ne bloque plus l'app ; une clé « __proto__ » est ignorée ; un fichier
   qui n'est pas une sauvegarde ne change rien ; un nom de dette en forme de formule est neutralisé dans le CSV. */
async function importSur(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "donnees" });
  const etat = await p.evaluate(() => JSON.parse(JSON.stringify(window.Wealthnord.etat())));
  etat.epargne.reee.enfants = [{ id: "e1", nom: "", age: -1e12, solde: 0 }];
  etat.dettes = [{ ...etat.dettes[0], nom: "=SOMME(A1)" }];
  const texte = JSON.stringify(etat).replace(/^\{/, '{"__proto__":{"pollue":1},');
  await p.setInputFiles("#importer", { name: "bizarre.json", mimeType: "application/json", buffer: Buffer.from(texte) });
  await p.waitForSelector("#feuille-corps .bouton.danger", { timeout: 10000 }); await p.click("#feuille-corps .bouton.danger"); await p.waitForTimeout(400);
  const apres = await p.evaluate(() => ({ age: window.Wealthnord.etat().epargne.reee.enfants[0].age, pollue: ({}).pollue, visible: !!document.querySelector("#v-donnees").offsetParent }));
  verifier("import : âge ramené dans ses bornes, aucune pollution, l'app reste là", apres.age === 0 && apres.pollue === undefined && apres.visible, apres);
  await p.setInputFiles("#importer", { name: "autre.json", mimeType: "application/json", buffer: Buffer.from('{"rien":1}') });
  await p.waitForTimeout(300);
  verifier("import : un autre fichier ne change rien", (await p.textContent("#donnees-message")).includes("Rien n'a été changé") && await p.evaluate(() => !document.getElementById("feuille").open));
  await allerA(p, "budget/dettes");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#exporter-plan")]);
  const csv = fs.readFileSync(await dl.path(), "utf8");
  verifier("CSV : un nom en forme de formule est neutralisé", csv.includes(`"'=SOMME(A1)"`), csv.slice(0, 120));
  verifier("import : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 37. Accessibilité (lot 8) : restaurer au clavier ; le focus reste dans un dialogue ; contrastes du thème sombre ;
   les liens « Détail » nommés par leur carte. */
async function accessibiliteLot8(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "donnees" });
  verifier("a11y : « Restaurer une sauvegarde » est un bouton atteignable", await p.evaluate(() => { const x = document.getElementById("restaurer-fichier"); x.focus(); return document.activeElement === x && x.tagName === "BUTTON"; }));
  await allerA(p, "revenu"); await p.click("#v-revenu .bouton-modifier"); await p.waitForTimeout(200);
  const dansDialogue = [];
  for (let i = 0; i < 80; i++) { await p.keyboard.press("Tab"); dansDialogue.push(await p.evaluate(() => !!document.activeElement.closest("dialog") && document.activeElement !== document.body)); }
  verifier("a11y : Tab ne sort jamais du panneau ouvert", dansDialogue.every(Boolean));
  await p.keyboard.press("Escape");
  const lien = await p.evaluate(() => document.querySelector("#rv-r-sources a.lien-carte").getAttribute("aria-label"));
  verifier("a11y : le lien « Détail » dit sa carte", lien === "Détail : D'où vient le revenu", lien);
  await p.emulateMedia({ colorScheme: "dark" });
  const couleurs = await p.evaluate(() => { const b = document.createElement("button"); b.className = "bouton danger plein"; document.body.appendChild(b);
    const c = getComputedStyle(b).color; b.remove(); return { c, axe: getComputedStyle(document.documentElement).getPropertyValue("--axe").trim() }; });
  verifier("a11y : en sombre, texte foncé sur le bouton destructeur", couleurs.c === "rgb(14, 14, 13)", couleurs);
  verifier("a11y : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 30. Le plan suit le calendrier : au premier lancement d'un nouveau mois, il repart du mois courant ; les soldes ne
   bougent pas (la personne les met à jour avec ses relevés). L'avis permet d'annuler pour ce mois-ci, sans perdre une
   modification faite pendant l'avis. Niveau de résidence au 1er juillet ; enfants et privilège au 1er janvier ;
   première année passée : année type ; en 2027, l'impôt 2027 avec des montants provisoires. */
async function planCalendrier(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { horloge: "2026-10-15T10:00:00" });
  await remplacer(p, { "strategie.debut": "2026-10" });
  const etat = () => p.evaluate(() => { const S = window.Wealthnord.etat();
    return { debut: S.strategie.debut, dettes: S.dettes.map(d => d.solde), reer: S.epargne.reer.solde, celi: S.epargne.celi.solde, encaisse: S.epargne.encaisse, avance: S.meta.planAvance,
      refus: S.meta.planRefuse, toast: document.getElementById("toast-texte").textContent, visible: !document.getElementById("toast").hidden, faire: document.getElementById("ap-actions").textContent }; });
  const avant = await etat();
  await p.clock.setFixedTime(new Date("2026-12-02T10:00:00"));
  await p.reload(); await pret(p);
  const dec = await etat();
  verifier("plan : en décembre, il part de décembre ; dettes et placements gardent leurs soldes", dec.debut === "2026-12" && dec.avance === "2026-12"
    && dec.dettes.join() === avant.dettes.join() && dec.reer === avant.reer && dec.celi === avant.celi, { dec, avant });
  verifier("plan : un avis avec Annuler ; « À faire » demande de mettre les soldes à jour", dec.visible && dec.toast.startsWith("Le plan part maintenant de décembre 2026")
    && dec.toast.includes("Vos soldes n'ont pas bougé") && dec.faire.includes("avec les soldes que vous avez inscrits"), dec.toast);
  // Une modification pendant l'avis : « Annuler » ne la défait pas.
  await p.evaluate(() => { window.Wealthnord.etat().epargne.encaisse = 12345; });
  await p.click("#toast-annuler"); await p.waitForTimeout(200);
  const annule = await etat();
  verifier("plan : Annuler rend le plan d'octobre et garde la modification faite pendant l'avis", annule.debut === "2026-10" && annule.refus === "2026-12" && annule.encaisse === 12345, annule);
  await p.reload(); await pret(p);
  verifier("plan : refusé pour décembre, il attend janvier", await p.evaluate(() => window.Wealthnord.etat().strategie.debut === "2026-10"));
  // Résidence : R2 en juin, R3 après le 1er juillet ; un enfant de 3 ans en a 4 après le 1er janvier ; le privilège repart.
  await p.clock.setFixedTime(new Date("2026-06-10T10:00:00"));
  await remplacer(p, { "strategie.debut": "2026-06", "meta.planRefuse": "", "residence.active": true, "residence.niveau": "2", "residence.debutPratique": "2028-07",
    "epargne.reee.enfants": [{ id: "e1", nom: "", age: 3, solde: 0 }],
    "dettes": [{ id: "h1", nom: "Hypothèque", type: "hypotheque", solde: 300000, limite: 0, taux: 4, paiement: 1600, frequence: "mois", interetsSeulement: false, finTerme: "2029-06-01",
      tauxRenouvellement: 4, dureeTerme: 5, privilege: 10, privilegeUtilise: 5000, creditImpot: 0, partMoi: 100, paiementMoi: 100 }] });
  await p.clock.setFixedTime(new Date("2027-01-04T10:00:00"));
  await p.reload(); await pret(p);
  const jan = await p.evaluate(() => { const S = window.Wealthnord.etat(); return { debut: S.strategie.debut, niveau: S.residence.niveau, actif: S.residence.active, age: S.epargne.reee.enfants[0].age,
    solde: S.dettes[0].solde, utilise: S.dettes[0].privilegeUtilise,
    titre: document.getElementById("h-impot").textContent, pied: document.getElementById("pied-parametres").textContent, toast: document.getElementById("toast-texte").textContent }; });
  verifier("plan : R3 au 1er juillet, un an de plus à l'enfant et le privilège qui repart au 1er janvier ; solde gardé", jan.debut === "2027-01" && jan.niveau === "3" && jan.actif && jan.age === 4
    && jan.utilise === 0 && jan.solde === 300000 && jan.toast.includes("résidence au niveau R3"), jan);
  verifier("plan : en 2027, l'impôt 2027, montants provisoires", jan.titre === "Impôt 2027" && jan.pied === "paramètres fiscaux 2027 (provisoires)", jan);
  // Première année de pratique en 2027 : en janvier 2028, l'app compte une année type.
  await remplacer(p, { "strategie.debut": "2027-09", "meta.planRefuse": "", "residence.active": false, "revenu.annee": "premiere", "revenu.anneePremiere": 2027 });
  await p.clock.setFixedTime(new Date("2028-01-10T10:00:00"));
  await p.reload(); await pret(p);
  const an2 = await p.evaluate(() => { const S = window.Wealthnord.etat(); return { annee: S.revenu.annee, debut: S.strategie.debut, toast: document.getElementById("toast-texte").textContent }; });
  verifier("plan : la première année (2027) passée, l'année type en 2028, avec l'avis", an2.debut === "2028-01" && an2.annee === "type"
    && an2.toast.includes("votre première année de pratique (2027) est passée : année type"), an2);
  await p.click("#toast-annuler"); await p.waitForTimeout(200);
  verifier("plan : Annuler remet la première année", await p.evaluate(() => { const S = window.Wealthnord.etat(); return S.revenu.annee === "premiere" && S.strategie.debut === "2027-09"; }));
  verifier("plan : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

(async () => {
  const srv = await serveur(), base = `http://127.0.0.1:${srv.address().port}`;
  const b = await chromium.launch();
  try {
    for (const scenario of [exemple, brochure, alertes, sauvegarde, robustesse, injection, rapport, nouvelleVersion, budget, logo, sousOnglets, repartition, verrou, verrouDelai, verrouOnglets, sommaireComptable, monteCarlo, apercuCoherent, assistantVide, assistantMode, rendementProfil, lexiqueRamq, fraisGardeMenage, acomptesCeliapp, finitions, enteteEtChamps, transfert, residence, resumeDetail, tempsQuiPasse, planCalendrier, comparerActes, outilsAvances, etSi, deuxOffres, demarrageRapide, importSur, accessibiliteLot8]) {
      if (process.env.SCENARIOS && !process.env.SCENARIOS.split(",").includes(scenario.name)) continue;
      try { await scenario(b, base); } catch (e) { verifier(`${scenario.name} : déroulement`, false, String(e).split("\n")[0]); }
    }
  } finally { await b.close(); srv.close(); }
  console.log(`${reussis} vérifications réussies, ${echecs} échec(s).`);
  process.exit(echecs ? 1 : 0);
})();
