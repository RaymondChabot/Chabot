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

(async () => {
  const srv = await serveur(), base = `http://127.0.0.1:${srv.address().port}`;
  const b = await chromium.launch();
  try {
    for (const scenario of [exemple, brochure, alertes, sauvegarde, robustesse, injection, rapport, nouvelleVersion]) {
      try { await scenario(b, base); } catch (e) { verifier(`${scenario.name} : déroulement`, false, String(e).split("\n")[0]); }
    }
  } finally { await b.close(); srv.close(); }
  console.log(`${reussis} vérifications réussies, ${echecs} échec(s).`);
  process.exit(echecs ? 1 : 0);
})();
