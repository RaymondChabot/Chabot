/* Tests de bout en bout dans Chromium : node tests/navigateur.test.js
   Démarre un petit serveur local, ouvre l'app et vérifie les parcours principaux.
   Aucune donnée personnelle : l'exemple de départ et des situations fictives. */
"use strict";
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
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
async function ouvrir(b, base, { largeur = 390, details = false, sw = false, page = "apercu" } = {}) {
  const ctx = await b.newContext({ viewport: { width: largeur, height: 844 }, acceptDownloads: true, serviceWorkers: sw ? "allow" : "block" });
  const p = await ctx.newPage(), erreurs = [];
  p.on("pageerror", e => erreurs.push(String(e)));
  p.on("console", m => { if (m.type() === "error") erreurs.push(m.text()); });
  await ctx.addInitScript(d => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", e => window.__csp.push(e.violatedDirective));
    try { localStorage.setItem("wm.assistant", "1"); sessionStorage.setItem("wm.ouverture", "1"); if (d) localStorage.setItem("wm.details", "1"); } catch (e) { /* stockage indisponible */ }
  }, details);
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
  for (const page of ["apercu", "revenu", "impot", "budget", "avenir", "donnees"]) {
    await allerA(p, page);
    const d = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    verifier(`page ${page} : pas de défilement horizontal à 390 px`, d <= 0, d);
  }
  verifier("données : restaurer une sauvegarde", (await p.textContent('label[for="importer"]')).includes("Restaurer une sauvegarde"));
  await allerA(p, "apercu");
  await p.click("#ap-assistant"); await p.waitForTimeout(300);
  verifier("assistant : pas d'import", !(await p.evaluate(() => [...document.querySelectorAll("#assistant label, #assistant button")].some(x => /import/i.test(x.textContent)))));
  verifier("sécurité du contenu : aucune violation", (await p.evaluate(() => window.__csp.length)) === 0, await p.evaluate(() => window.__csp));
  verifier("exemple : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 2. Montants de la Brochure no 1 : ils suivent la colonne et la liste ; une valeur modifiée reste ; « Rétablir ». */
async function brochure(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { details: true, page: "revenu" });
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
  await n.p.setInputFiles("#importer", fichier); await n.p.waitForTimeout(500);
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
  verifier("budget : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 10. Logo : l'arbre à côté du nom ; au clic, le sceau 0,3 seconde, puis l'accueil. */
async function logo(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "budget" });
  verifier("en-tête : l'arbre seul", await p.evaluate(() => document.querySelector(".barre-haut .marque-ico use").getAttribute("href") === "#wm-arbre"));
  await p.click(".barre-haut a.marque");
  const pendant = await p.evaluate(() => new Promise(r => setTimeout(() => r(document.querySelector(".ouverture").classList.contains("eclair")), 150)));
  await p.waitForTimeout(600);
  const apres = await p.evaluate(() => ({ eclair: document.querySelector(".ouverture").classList.contains("eclair"), page: location.hash }));
  verifier("logo : sceau au clic, puis l'accueil", pendant && !apres.eclair && apres.page === "#apercu", apres);
  verifier("logo : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}

/* 11. Sous-onglets : Budget et Patrimoine montrent une partie à la fois ; un lien peut viser un onglet. */
async function sousOnglets(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "budget" });
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
  verifier("sous-onglets : #budget/dettes ouvre les dettes", dettes.length > 0 && dettes.every(s => s === "dettes") && await p.evaluate(() => location.hash) === "#budget", dettes);
  await allerA(p, "avenir");
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
  verifier("sous-onglets : l'onglet choisi est gardé", (await visibles("avenir")).every(s => s === "proches"));
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
  verifier("comptable : revenus, impôt, échéances et documents", ["Revenus et déductions", "Impôt estimé 2026", "Échéances", "Documents à rassembler"].every(t => a.texte.includes(t)));
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
  verifier("comptable chargé : acomptes, REER, garde et partenaire", ["Acomptes 2026", "REER : droits inutilisés", "Frais de garde", "Votre partenaire"].every(t => c.texte.includes(t)), c.texte.slice(0, 300));
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
  await p.check('input[name="as-milieu"][value="gmfu"]'); await suivant(); await suivant();
  await p.check('input[name="as-logement"][value="proprietaire"]'); await suivant(); await suivant(); await suivant();
  await p.waitForTimeout(300);
  const neuf = await p.evaluate(() => ({ etiquette: document.querySelector("#ap-hero .hero-etiquette").textContent, lien: !!document.querySelector('#ap-hero a[href="#budget"]') }));
  verifier("aperçu sans dépenses : revenu net et lien vers le budget", neuf.etiquette === "Votre revenu net mensuel" && neuf.lien, neuf);
  await remplacer(p, { "budget.0.montant": 500 });
  verifier("aperçu avec une dépense : surplus", (await p.textContent("#ap-hero .hero-etiquette")) === "Votre surplus mensuel");
  verifier("aperçu : aucune erreur", erreurs.length === 0, erreurs);
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
  await suivant(); await suivant();
  await p.check('input[name="as-logement"][value="locataire"]'); await suivant(); await suivant();
  verifier("assistant : le mode dans le récapitulatif", (await p.textContent("#as-corps")).includes("GMF-U · taux mixte"));
  await suivant(); await p.waitForTimeout(300);
  const r = await resultat(p);
  verifier("assistant : GMF-U au mixte", r.milieu === "gmfu" && r.mode === "mixte", { milieu: r.milieu, mode: r.mode });
  await allerA(p, "impot");
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
  const { ctx, p, erreurs } = await ouvrir(b, base, { page: "revenu" });
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
    const marque = r(".barre-haut .marque"), barre = document.querySelector(".barre-outils"), h1 = r("#h-apercu"), hero = r("#ap-hero");
    const boutons = [...barre.children].filter(x => getComputedStyle(x).display !== "none").map(x => x.getBoundingClientRect()).sort((a, c) => a.top - c.top);
    return { largeur: Math.round(marque.width), place: innerWidth - 32, vue: barre.parentElement.id, n: boutons.length,
      memeX: boutons.every(x => Math.abs(x.left - boutons[0].left) < 1), empiles: boutons.every((x, i) => !i || x.top >= boutons[i - 1].bottom),
      aDroite: boutons[0].left > h1.right && boutons[0].left > hero.right, heroACote: hero.top < boutons[boutons.length - 1].bottom };
  });
  verifier("en-tête : le logo et le nom sur toute la largeur", m.largeur >= m.place - 1, m);
  verifier("en-tête : Rapport PDF, thème et Données empilés à droite du titre et du chiffre", m.vue === "v-apercu" && m.n >= 3 && m.memeX && m.empiles && m.aDroite && m.heroACote, m);
  await allerA(p, "revenu");
  verifier("en-tête : les boutons suivent la page ouverte, sans Rapport PDF", await p.evaluate(() => document.querySelector(".barre-outils").parentElement.id === "v-revenu" && document.getElementById("barre-pdf").hidden));
  await allerA(p, "apercu");
  for (const largeur of [320, 360, 430]) {
    await p.setViewportSize({ width: largeur, height: 800 }); await p.waitForTimeout(150);
    verifier(`en-tête : rien ne déborde à ${largeur} px`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll("#v-apercu > *")].every(x => x.getBoundingClientRect().right <= innerWidth - 15)));
  }
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
  await autre.p.fill("#transfert-code", "AAAA-BBBB-CCCC-DDDD"); await autre.p.click(".transfert-form [type=submit]"); await autre.p.waitForTimeout(900);
  verifier("transfert : mauvais code refusé", (await autre.p.textContent(".transfert-form .message")).includes("Code incorrect"));
  await autre.p.fill("#transfert-code", code.replace(/-/g, "").toLowerCase()); await autre.p.click(".transfert-form [type=submit]");
  await autre.p.waitForSelector("#feuille-corps .bouton.danger", { timeout: 5000 });
  const resume = await autre.p.textContent("#feuille-corps .feuille-intro");
  verifier("transfert : ce qui arrive est décrit avant de remplacer", /^Données du .+ : \d+ dettes?, \d+ dépenses? inscrites?\. Elles remplaceront/.test(resume), resume);
  await autre.p.click("#feuille-corps .bouton.danger"); await autre.p.waitForTimeout(300);
  const recu = await autre.p.evaluate(() => { const S = window.Wealthnord.etat(); return { semaines: S.revenu.semaines, montant: S.budget[0].montant, exemple: S.meta.exemple, feuille: document.getElementById("feuille").open }; });
  verifier("transfert : données remplacées par celles de l'autre appareil", recu.semaines === 41 && recu.montant === 1234 && !recu.exemple && !recu.feuille, recu);
  await autre.ctx.close();
  // Coller le lien dans l'app (iPhone : l'app installée garde ses propres données).
  const troisieme = await ouvrir(b, base, { page: "donnees" });
  await troisieme.p.click("#transfert-recevoir"); await troisieme.p.waitForSelector("#transfert-lien");
  await troisieme.p.fill("#transfert-lien", lien.slice(0, -12)); await troisieme.p.fill("#transfert-code", code); await troisieme.p.click(".transfert-form [type=submit]"); await troisieme.p.waitForTimeout(900);
  verifier("transfert : lien abîmé refusé", (await troisieme.p.textContent(".transfert-form .message")).includes("incomplet ou abîmé"));
  await troisieme.p.fill("#transfert-lien", `Voici le lien : ${lien}`); await troisieme.p.click(".transfert-form [type=submit]");
  await troisieme.p.waitForSelector("#feuille-corps .bouton.danger", { timeout: 5000 });
  await troisieme.p.click("#feuille-corps .bouton.danger"); await troisieme.p.waitForTimeout(300);
  verifier("transfert : lien collé dans l'app, puis reçu", await troisieme.p.evaluate(() => window.Wealthnord.etat().revenu.semaines === 41));
  verifier("transfert : aucune erreur", erreurs.length + autre.erreurs.length + troisieme.erreurs.length === 0, [...erreurs, ...autre.erreurs, ...troisieme.erreurs]);
  await troisieme.ctx.close(); await ctx.close();
}

(async () => {
  const srv = await serveur(), base = `http://127.0.0.1:${srv.address().port}`;
  const b = await chromium.launch();
  try {
    for (const scenario of [exemple, brochure, alertes, sauvegarde, robustesse, injection, rapport, nouvelleVersion, budget, logo, sousOnglets, repartition, verrou, verrouDelai, verrouOnglets, sommaireComptable, monteCarlo, apercuCoherent, assistantMode, rendementProfil, lexiqueRamq, fraisGardeMenage, acomptesCeliapp, finitions, enteteEtChamps, transfert]) {
      try { await scenario(b, base); } catch (e) { verifier(`${scenario.name} : déroulement`, false, String(e).split("\n")[0]); }
    }
  } finally { await b.close(); srv.close(); }
  console.log(`${reussis} vérifications réussies, ${echecs} échec(s).`);
  process.exit(echecs ? 1 : 0);
})();
