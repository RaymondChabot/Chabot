# Audit H — Carte des tests

La suite complète n'a pas été relancée. Le départ donné tient : ESLint sans erreur, 202 réussites dans `tests/calculs.test.js`, écart maximal 40 $ avec l'outil officiel du ministère des Finances, 235 réussites et 0 échec dans `tests/navigateur.test.js` (`/tmp/navigateur-depart.txt`, première ligne et `EXIT:0`).

`Calc` exporte 48 noms (`js/calc.js:946-947`). Trois ne sont jamais appelés. Le renouvellement est noté dans le test, sans le nouveau paiement. Une cotisation CELIAPP au-dessus de 8 000 $ n'a aucun cas, alors que le calcul l'accepte (audit G-01).

Trente scénarios de navigateur couvrent l'exemple, la résidence, le verrou, le transfert et le plan qui avance d'un mois ou deux. L'assistant au premier lancement, le thème sombre, un plan B créé à l'écran, les deux CSV et une année de plan 2028 n'y sont pas.

Huit tests sont écrits dans l'annexe, les plus utiles d'abord, plus un neuvième pour les parcours. H-01 et H-03 échouent sur le code d'aujourd'hui. Les autres décrivent un comportement déjà juste. Aucun n'a été collé dans les fichiers de test.

## Carte de `Calc`

Appel direct dans `tests/calculs.test.js` : `P2026`, `P2027`, `parametres`, `utiliserAnnee`, `avecAnnee`, `parametresActifs`, `TARIFS_LIEU`, `lieuTarifs`, `montantsLieu`, `montantsVolume`, `tauxPolyvalence`, `compensationCabinet`, `tarifVisite`, `revenuGmfu`, `joursActivite`, `revenuActivite`, `impotParticulier`, `impotSalarie`, `impotMixte`, `FMRQ`, `salaireResident`, `transfertsConjoints`, `prestationsFamille`, `primeMedicaments`, `impotSociete`, `simulerDettes`, `tauxMensuel`, `moisRestants`, `paiementPour`, `projeterReee`, `projeterValeurNette`, `rendementProfil`, `fraisGarde`. `MONTANTS_LIEU` est lu par `js/catalogues.js:536` et couvert par `montantsLieu`.

Effet couvert, nom absent du test : `RAMQ` (le taux horaire 99,48 $ et le plafond de 1 540 h passent par `revenuGmfu`), `VISITES` et `TARIFS_DEFAUT` (visites et suppléments), `PCT_AU_DELA`, `PCT_GARDE`, `GARDE_MAX_94` (71,8 %, 94 %, 528 h, lignes 255 à 264 du test), `SEUILS_POLYVALENCE` et `ACTIVITES_POLYVALENTES` (taux et activités exclues, lignes 179 à 193).

Aucun cas, et aucun appel hors de l'export :

| Export | Ligne | Ce qui existe à la place |
|---|---|---|
| `PRISE_EN_CHARGE` | `js/calc.js:169` | Les tarifs viennent de `TARIFS_LIEU`. L'objet n'est pas lu. |
| `tauxMarginal` | `js/calc.js:607` | L'app refait le calcul sur 1 000 $ (`js/app.js:580`). |
| `remboursementReer` | `js/calc.js:612` | L'app soustrait deux impôts (`js/app.js:599`). |

Aucun cas, alors que le code est vivant :

| Export | Ligne | Trou |
|---|---|---|
| `impotDividendes` | `js/calc.js:617` | Seulement appelé par `comparerSociete`. |
| `comparerSociete` | `js/calc.js:653` | Un appel, `js/app.js:839`. `impotSociete` a des cas. La comparaison particulier / société n'en a pas. |
| `tauxReel` | `js/calc.js:689` | Sert au tri des dettes et à l'écran (`js/app.js:1832`). Le test vérifie `interetsNets <= interets`, pas le taux après le crédit de 34 %. |

`transfertsConjoints` est appelé, mais seulement dans la boucle de l'outil officiel (lignes 21 à 33), y compris un conjoint à 0 $. Le montant du transfert n'est pas isolé (H-08). `primeMedicaments` non plus : la boucle compare `pr.total` à l'officiel 2026. Elle ne voit pas l'indexation 2027 (H-03).

`impotMixte` a des cas sous les plafonds : salaire 30 000 $ plus entreprise (lignes 300 à 306), égalité avec `impotParticulier` sans salaire, égalité avec `impotSalarie` sans entreprise (lignes 294 à 299). Pas de cas assis sur le maximum RRQ, RQAP et assurance-emploi (H-07).

`fraisGarde` couvre 67 % de 12 525 $ au-dessus de 122 290 $, deux enfants, 16 ans révolus (âge 17 → 0), les deux tiers du revenu gagné, le seuil 122 290 / 122 291, et la déduction fédérale qui ne change pas l'impôt du Québec (lignes 231 à 245). Pas la frontière 6 ans / 7 ans, pas l'âge 16 encore admissible, pas `indexQc`, pas des frais négatifs (H-05).

`simulerDettes` couvre avalanche, hybride, boule de neige et minimums, les soldes jamais négatifs, et l'enregistrement du renouvellement (taux 4,5 %, année 2028). Pas le paiement recalculé (H-02), pas un taux de 0 % (H-06).

`projeterValeurNette` couvre l'équité, la maison, l'auto, les autres actifs, les objectifs, une suite de rendements, et le relevé après 3 et 12 mois. Le CELIAPP du relevé (lignes 332 à 341) verse 8 000 $, donc il ne peut pas voir un dépassement du plafond annuel (H-01).

Hors de l'objet `Calc`, `cotisationsAutonome` et `fss` ne sont pas exportés. Ils sont atteints par `impotParticulier` et `impotMixte`. `avancerPlan` (`js/app.js:3253`) n'est pas exporté : le test passe par le navigateur.

## Parcours du navigateur

`ouvrir` (`tests/navigateur.test.js:35`) pose `wm.assistant` et `wm.ouverture` avant le chargement. L'assistant du premier lancement ne s'ouvre donc jamais seul. Le scénario `assistantMode` (ligne 487) traverse plusieurs étapes une fois l'assistant ouvert à la main, sur l'exemple déjà là. Il ne part pas d'un stockage vide.

Panneaux « Modifier » ouverts et, pour une part, remplis : Revenu (`brochure`, `alertes`, `lexiqueRamq`, `enteteEtChamps`) et le flux résidence. `FEUILLES` (`js/app.js:235`) a aussi Impôt, Ménage, Plan de remboursement, Épargne et Hypothèses. Aucun scénario ne remplit ces formulaires, ni une catégorie de dépense, une dette, un enfant, une activité, un objectif, un jalon ou le dossier.

Thème : le bouton existe (`finitions`, ligne 636) et `#theme-choix` a un rectangle (`resumeDetail`, ligne 890). Rien n'écrit `dataset.theme = "dark"` ni `wealthnord.theme`.

320 px : débordement de l'en-tête de l'aperçu (`enteteEtChamps`, ligne 664, largeurs 320, 360 et 430) et icône Données (`finitions`, ligne 640). Les autres pages, en résumé et en détail, ne sont pas mesurées à 320 px.

Année 2028 : `parametres(2027)` et `parametres(2031)` valent `P2027` (calculs, ligne 323). `salaireResident` après l'entente utilise la date 2029 (ligne 291). Aucun plan dont le début est 2028 n'est ouvert dans le navigateur. Les mentions « 2028 » à l'écran sont le solde d'impôt du 30 avril 2028, après une première année de pratique en 2027 (`residence`, `tempsQuiPasse`).

Taux 0 % : aucun cas. Plan B : le scénario `injection` (ligne 182) pose un nom de plan piégé. Il ne clique pas « Créer un plan B », ne compare pas, n'adopte pas. Rapport PDF : `rapport` appelle `construire()`, compte les pages (5 à 8) et trois chaînes. `residence` vérifie deux titres. `sommaireComptable` remplace `window.print`. `imprimer()` du rapport complet, par le bouton, n'est pas suivi page par page. CSV : `exporterTableur` (`js/app.js:2240`) et le bouton `#exporter-plan` (`js/app.js:3584`) n'ont aucun test.

`planCalendrier` (ligne 933) avance d'octobre à décembre 2026, annule, puis passe de juin 2026 à janvier 2027 (niveau de résidence, enfant + 1 an). Il ne saute pas plusieurs mois d'un coup avec une dette déjà à 0 et une dette qui tombe à 0 pendant le saut (H-04).

## Constats

| ID | Gravité | Fichier et ligne | Constat | Preuve | Correction proposée | Effort |
|---|---|---|---|---|---|---|
| H-01 | élevée | `tests/calculs.test.js:335`, `tests/navigateur.test.js:613` | Aucun cas au-dessus de 8 000 $ par année au CELIAPP. Les cas existants versent exactement 8 000 $. | Navigateur : `"8000,2000,0"` et `"8000,8000,0"`, cotisation 8 000 $. Calculs : `cotisationAnnuelle: 8000`. À 20 000 $, la projection donne 20 000 $ dès l'indice 1 (G-01). | Annexe, test 1. Il échoue aujourd'hui. Le garder ainsi : l'affaiblir pour accepter 20 000 $ figerait l'erreur. | S |
| H-02 | élevée | `tests/calculs.test.js:62` | Le renouvellement est « enregistré ». Le paiement n'est pas lu. Un paiement figé à 1 200 $ laisserait le test vert. | Lignes 62 à 64 : `r.taux === 4.5` et l'année 2028. Le commentaire du test dit pourtant que le paiement est recalculé. Mesure : 1 248,87 $, écart 0 avec `paiementPour` (G-04). | Annexe, test 2. Il réussit aujourd'hui. Il doit exiger un paiement différent de 1 200 $. | S |
| H-03 | moyenne | `tests/calculs.test.js:316` | `P2027` est testé sur les paliers, l'assurance-emploi et le crédit pour dividendes. Pas sur la phrase du commentaire (médicaments, RRQ, RQAP, allocation canadienne). | Lignes 316 à 330. Les déductions 2027 diffèrent (G-05). Maximum, seuil, taux, RRQ, RQAP et allocation canadienne sont encore ceux de 2026. | Annexe, test 3. L'assertion sur les déductions échoue aujourd'hui. Les trois autres réussissent. | S |
| H-04 | moyenne | `tests/navigateur.test.js:933` | `avancerPlan` est testé sur +2 mois et sur un 1er janvier. Pas sur un saut de plusieurs mois, ni sur une dette déjà à 0, ni sur une dette remboursée entre les deux dates. | `planCalendrier`. `avancerPlan` (`js/app.js:3259`) prend `sim.mois[k - 1]`, ou des zéros si le mois manque. D'octobre 2026 à juin 2027, `k` vaut 8 : le solde est celui de `mois[7]`. Un janvier est franchi, pas de juillet. | Annexe, test 4. Il compare au solde prévu, sans montant écrit en dur. Non exécuté. Le code actuel le satisfait. | S |
| H-05 | moyenne | `tests/calculs.test.js:234` | Les frais de garde n'ont pas leurs bords : 7 ans, 6 ans, 16 ans, `indexQc`, frais négatifs, revenu gagné nul. | Le filtre est `âge <= 16`, le plafond « moins de 7 ans » est `âge < 7` (`js/calc.js:937-938`). L'app n'envoie pas `indexQc` (`js/app.js:723`). | Annexe, test 5. Il réussit aujourd'hui. Il ne décide pas si l'app doit un jour passer `indexQc`. | S |
| H-06 | moyenne | `tests/calculs.test.js:46` | Aucun taux à 0 %. `paiementPour` et `moisRestants` ont une branche `i === 0` (`js/calc.js:700-703`) sans cas. | Prêt 12 000 $ à 0 %, paiement 1 000 $ : libre en décembre 2026, intérêts 0. Marge en intérêts seulement : solde 5 000 $, intérêts 0, jamais libre. Puis renouvellement à 5 % : solde 115 000 $, paiement recalculé, écart 0. Les intérêts de toute la simulation ne sont pas 0, à cause des mois d'après. | Annexe, test 6. Il réussit aujourd'hui. Ne pas exiger des intérêts totaux nuls sur le cas 0 % puis 5 %. | S |
| H-07 | moyenne | `tests/calculs.test.js:300` | La transition mixte est sous les plafonds (salaire 30 000 $). Au-dessus, le salaire remplit RRQ, RQAP et assurance-emploi, et l'entreprise n'ajoute rien à ces trois cotisations. | Plafonds 2026 dans `P2026` : MGA 74 600 $, MGS 85 000 $, RQAP 103 000 $, assurance-emploi 68 900 $. Salaire 200 000 $ : RRQ 4 895,30 $, RQAP 442,90 $, assurance-emploi 895,70 $. Avec 80 000 $ de revenu et 10 000 $ de dépenses : les trois montants identiques, Fonds des services de santé 206,45 $. | Annexe, test 7. Il réussit aujourd'hui. La formule est dans le test, pas un nombre magique seul. | S |
| H-08 | faible | `tests/calculs.test.js:23` | `transfertsConjoints` n'est exercé que dans le total de l'outil officiel. L'ordre des deux résultats et le cas de deux revenus élevés égaux ne sont pas isolés. | Boucle des lignes 21 à 33, qui comprend un salaire 0. Isolé : (0, 120 000 $) donne 0 $ puis 4 576,52 $, et le total du second passe de 38 170,89 $ à 33 594,37 $. Deux salaires de 90 000 $ : 0 $ des deux côtés. (120 000 $, 15 000 $) : le premier reçoit 878,56 $, le second 0 $, et l'ordre suit les arguments. | Annexe, test 8. Il réussit aujourd'hui. La boucle officielle reste la vérification du total. | S |
| H-09 | moyenne | `tests/navigateur.test.js:35` | Plusieurs parcours visibles n'ont pas de scénario, ou seulement un bout. | Liste « Parcours du navigateur », plus haut. L'assistant complet est empêché par `ouvrir`. Le thème sombre n'est jamais posé. Le plan B n'est qu'un nom dans `injection`. | Annexe, test 9 (thème, plan B, 320 px, deux CSV, bouton PDF). Non exécuté. À ajouter après les huit autres. | M |

## Vérifié et trouvé correct

Les 202 réussites et l'écart de 40 $ sont ceux du départ, pas une nouvelle exécution. Le commentaire du test (ligne 31) situe cet écart : 40 $ d'impôt fédéral pour un couple 80 000 $ + 40 000 $, et 1 $ au plus ailleurs. La boucle officielle appelle déjà `transfertsConjoints`, `prestationsFamille` et `primeMedicaments` sur les cas d'emploi, dont un conjoint à 0 $.

Le renouvellement recalcule le paiement. Le test ne le voit pas, le calcul est juste (G-04). Les branches à taux 0 de `paiementPour`, `moisRestants` et `tauxMensuel` donnent 1 000 $, 12 mois et 0 sur un solde de 12 000 $. La garde aux âges 6, 7 et 16, les frais négatifs et `indexQc` se comportent comme la fonction est écrite (test 5). Les plafonds de `impotMixte` tombent sur la formule des paramètres 2026 (test 7).

`planCalendrier` couvre vraiment le changement de mois, l'annulation, le 1er juillet (niveau de résidence) et le 1er janvier (âge de l'enfant). `rapport` vérifie un nombre de pages et des sources. Ce n'est pas une absence de test PDF : c'est l'absence du bouton et du contenu page par page.

Les scénarios sont filtrables par `SCENARIOS=nom` sur `function.name` (ligne 973). Un test nouveau doit être ajouté au tableau de la ligne 972, sinon il n'est jamais appelé.

## Questions

1. H-01 et H-03 échouent tant que le code n'a pas changé. Voulez-vous ces deux tests tout de suite, quitte à voir la suite rouge, ou seulement une fois le plafond CELIAPP et le commentaire de `P2027` tranchés (questions 1 et 2 de l'audit G) ?
2. Si vous gardez l'indexation des déductions médicaments, le test 3 doit attendre les montants indexés (20 937, 33 937, 38 379, 33 937, 38 379, 42 484) au lieu de l'égalité avec 2026. Lequel des deux contrats figez-vous ?
3. `indexQc` n'est envoyé par aucune page. Le test 5 le fige comme argument facultatif. Faut-il aussi un cas de projection où le crédit de garde des années futures suit l'indice du Québec, aujourd'hui seulement le facteur d'inflation `I` ?
4. Le test 9, surtout 320 px sur chaque page, n'a pas été exécuté. S'il échoue, c'est un défaut d'écran, pas une erreur de l'annexe à corriger en affaiblissant l'assertion.

## Annexe — code des tests proposés

À coller plus tard, pas maintenant. Les tests 1 et 3 échouent sur le code actuel. Les tests 2, 4, 5, 6, 7 et 8 réussissent si on les ajoute tels quels. Le test 9 n'a pas été lancé.

Le style est celui des fichiers : `verifier`, `proche`, et pour le navigateur `ouvrir`, `remplacer`, `p.evaluate`. Les fonctions de navigateur s'ajoutent au tableau de `tests/navigateur.test.js:972`.

### Test 1 — CELIAPP au-dessus de 8 000 $ (échoue aujourd'hui)

Dans `tests/calculs.test.js`, après le bloc 25. Aujourd'hui l'indice 1 vaut 20 000 $, pas 8 000 $, et l'indice 2 vaut déjà 40 000 $.

```javascript
/* 26. CELIAPP : 8 000 $ par année et 40 000 $ à vie. Au-dessus de 8 000 $, on ne déduit
   et on ne projette que 8 000 $. Cinq années à 8 000 $ atteignent le plafond à vie. */
const optCeliapp = { annees: 6, anneeDepart: 2026, rendement: 0, reer: { solde: 0, cotisationAnnuelle: 0 }, celi: { solde: 0, cotisationAnnuelle: 0 },
  celiapp: { solde: 0, cotisationAnnuelle: 20000, cotisationsVersees: 0 }, maison: { valeur: 0, part: 0, croissance: 0 }, dettes: [], voitures: [] };
const projCeliapp = C.projeterValeurNette(optCeliapp, C.simulerDettes([], { debut: "2026-01", methode: "minimum" }));
verifier("CELIAPP : 20 000 $ demandés, 8 000 $ la première année", proche(projCeliapp[1].celiapp, 8000, 0.01), projCeliapp[1].celiapp);
verifier("CELIAPP : 16 000 $ après deux années, pas le plafond à vie", proche(projCeliapp[2].celiapp, 16000, 0.01), projCeliapp[2].celiapp);
verifier("CELIAPP : 40 000 $ à la cinquième année, puis plus rien", proche(projCeliapp[5].celiapp, 40000, 0.01) && proche(projCeliapp[6].celiapp, 40000, 0.01), projCeliapp.map(x => x.celiapp));
```

Dans `tests/navigateur.test.js`, scénario à ajouter à la ligne 972. Aujourd'hui `R.celiappAnnee` renvoie 20 000, 20 000, 0, 0, 0, 0.

```javascript
/* CELIAPP : le plafond annuel de l'écran est le même que celui de la projection. */
async function celiappAnnuel(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base);
  await remplacer(p, { "epargne.celiapp": { solde: 0, cotisationAnnuelle: 20000, cotisationsVersees: 0 } });
  const annees = await p.evaluate(() => {
    const R = window.Wealthnord.resultats();
    return [0, 1, 2, 3, 4, 5].map(a => R.celiappAnnee(a));
  });
  verifier("CELIAPP : 8 000 $ pendant cinq ans, puis 0", annees.join() === "8000,8000,8000,8000,8000,0", annees);
  verifier("CELIAPP annuel : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}
```

### Test 2 — Renouvellement, paiement recalculé (réussit aujourd'hui)

À la suite du bloc 3 de `tests/calculs.test.js`. Le paiement doit différer de 1 200 $, sinon un paiement figé passerait.

```javascript
/* Le paiement du renouvellement : même amortissement restant, au nouveau taux.
   La dette est celle du bloc 3 (solde 200 000 $, 4 %, 1 200 $, renouvellement à 4,5 % en juin 2028). */
const renouv = C.simulerDettes([dettes[1]], { debut: "2026-11", methode: "minimum", moisMax: 600 });
const premier = renouv.dettes[0].premierRenouvellement;
const nDepart = C.moisRestants(200000, C.tauxMensuel({ type: "hypotheque" }, 4), 1200);
const moisRenouv = 19;
const paiementAttendu = C.paiementPour(premier.solde, C.tauxMensuel({ type: "hypotheque" }, 4.5), nDepart - moisRenouv);
verifier("renouvellement : taux 4,5 % en juin 2028, paiement recalculé", premier && premier.taux === 4.5
  && premier.date.getFullYear() === 2028 && premier.date.getMonth() === 5
  && premier.paiement !== 1200 && proche(premier.paiement, paiementAttendu, 1e-6), { paiement: premier && premier.paiement, paiementAttendu });
```

### Test 3 — `P2027` et son commentaire (l'assertion des déductions échoue aujourd'hui)

À la suite du bloc 24. Les trois dernières assertions réussissent déjà. La première échoue tant que la ligne 85 de `js/calc.js` indexe les déductions. Si vous gardez cette indexation, remplacez la première assertion par les montants indexés, indiqués en commentaire, et réécrivez le commentaire du moteur.

```javascript
/* 27. Ce que le commentaire de P2027 dit laisser à 2026 : RRQ, RQAP, prime médicaments, allocation canadienne.
   Les déductions médicaments font partie de la prime. Maximum, seuil et taux aussi. */
const med26 = C.P2026.medicaments, med27 = C.P2027.medicaments;
verifier("2027 : déductions médicaments encore celles de 2026", JSON.stringify(med27.deductions) === JSON.stringify(med26.deductions), med27.deductions);
// Si l'indexation est voulue, à la place : seul 20937, mono1 33937, mono2 38379, couple0 33937, couple1 38379, couple2 42484.
verifier("2027 : maximum, seuil et taux de la prime inchangés", med27.max === med26.max && med27.seuil === med26.seuil
  && med27.tauxSeul.join() === med26.tauxSeul.join() && med27.tauxCouple.join() === med26.tauxCouple.join());
verifier("2027 : RRQ, RQAP et allocation canadienne inchangés", JSON.stringify(C.P2027.rrq) === JSON.stringify(C.P2026.rrq)
  && JSON.stringify(C.P2027.rqap) === JSON.stringify(C.P2026.rqap) && JSON.stringify(C.P2027.ace) === JSON.stringify(C.P2026.ace));
verifier("2027 : le seuil 2 du Fonds des services de santé est le seul indexé", C.P2027.fss.seuil2 === 66380 && C.P2027.fss.seuil1 === C.P2026.fss.seuil1
  && C.P2027.fss.palier === C.P2026.fss.palier && C.P2027.fss.max === C.P2026.fss.max && C.P2027.fss.taux === C.P2026.fss.taux);
```

La dernière assertion réussit aujourd'hui. Elle documente le partage (G-05). Si vous désindexez `seuil2`, elle devient le contrat inverse : `C.P2027.fss.seuil2 === C.P2026.fss.seuil2`.

### Test 4 — `avancerPlan`, mois sautés et dettes déjà remboursées (réussit aujourd'hui, non exécuté)

Scénario de navigateur. D'octobre 2026 à juin 2027, `moisEntre` vaut 8, donc le solde lu est `sim.mois[7]`, après le paiement de mai. Le petit prêt à 0 % tombe à 0 dès le premier mois. La dette déjà à 0 le reste. L'hypothèque reste positive. Un 1er janvier est franchi : l'enfant passe de 3 à 4 ans. Aucun 1er juillet.

```javascript
/* Plan qui saute plusieurs mois : dettes déjà à zéro, dette remboursée dans l'intervalle, enfant au 1er janvier. */
async function planMoisSautes(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { horloge: "2026-10-15T10:00:00" });
  const dettes = [
    { id: "petit", nom: "Petit prêt", type: "pret", solde: 500, taux: 0, paiement: 500, frequence: "mois", interetsSeulement: false, finTerme: "", tauxRenouvellement: 0, privilege: 0, creditImpot: 0, partMoi: 100, paiementMoi: 100 },
    { id: "deja", nom: "Déjà remboursé", type: "pret", solde: 0, taux: 5, paiement: 100, frequence: "mois", interetsSeulement: false, finTerme: "", tauxRenouvellement: 0, privilege: 0, creditImpot: 0, partMoi: 100, paiementMoi: 100 },
    { id: "hyp", nom: "Hypothèque", type: "hypotheque", solde: 100000, taux: 4, paiement: 600, frequence: "mois", interetsSeulement: false, finTerme: "", tauxRenouvellement: 4, privilege: 0, creditImpot: 0, partMoi: 100, paiementMoi: 100 },
  ];
  await remplacer(p, { "strategie.debut": "2026-10", "meta.planRefuse": "", dettes, "epargne.reee.enfants": [{ id: "e1", nom: "", age: 3, solde: 0 }] });
  const prevu = await p.evaluate(() => {
    const mois = window.Wealthnord.resultats().sim.mois[7];
    return mois.soldes.map(v => Math.round(v * 100) / 100);
  });
  await p.clock.setFixedTime(new Date("2027-06-02T10:00:00"));
  await p.reload(); await pret(p);
  const juin = await p.evaluate(() => {
    const S = window.Wealthnord.etat();
    return { debut: S.strategie.debut, soldes: S.dettes.map(d => d.solde), age: S.epargne.reee.enfants[0].age };
  });
  verifier("plan sauté : juin 2027, soldes prévus, hypothèque encore là", juin.debut === "2027-06" && juin.soldes.join() === prevu.join()
    && juin.soldes[0] === 0 && juin.soldes[1] === 0 && juin.soldes[2] > 0, { juin, prevu });
  verifier("plan sauté : l'enfant a un an de plus", juin.age === 4, juin.age);
  verifier("plan sauté : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}
```

### Test 5 — Frais de garde, limites (réussit aujourd'hui)

À la suite du bloc 19. L'âge 7 prend le plafond « autres ». L'âge 6 prend « moins de 7 ans ». L'âge 16 est encore admissible. `indexQc` n'arrondit pas au multiple de 5 $ : ce n'est pas le plafond déjà arrondi de `P2027`.

```javascript
/* 28. Frais de garde : frontière d'âge, âge 16, indexation facultative, frais négatifs, revenu gagné nul. */
const garde7 = C.fraisGarde({ ages: [7], fraisQc: 10000, fraisFed: 10000, revenuFamilial: 20000, revenuGagne: 20000 });
const garde6 = C.fraisGarde({ ages: [6], fraisQc: 20000, fraisFed: 20000, revenuFamilial: 20000, revenuGagne: 20000 });
verifier("garde : 7 ans, plafonds de 6 305 $ et 5 000 $", garde7.plafondQc === 6305 && garde7.plafondFed === 5000 && garde7.admissibleQc === 6305 && garde7.deduction === 5000, garde7);
verifier("garde : 6 ans, plafonds de 12 525 $ et 8 000 $", garde6.plafondQc === 12525 && garde6.plafondFed === 8000 && garde6.taux === 0.78 && garde6.deduction === 8000, garde6);
const garde16 = C.fraisGarde({ ages: [16], fraisQc: 1000, fraisFed: 1000, revenuFamilial: 20000, revenuGagne: 20000 });
verifier("garde : 16 ans encore admissible", proche(garde16.creditQc, 780, 1e-6) && garde16.deduction === 1000, garde16);
const idx = 1.0315;
const gardeIdx = C.fraisGarde({ ages: [3], fraisQc: 20000, fraisFed: 20000, revenuFamilial: 25305 * idx, revenuGagne: 0, indexQc: idx });
verifier("garde : indexQc multiplie le plafond, sans l'arrondir ; revenu gagné nul, déduction 0", proche(gardeIdx.plafondQc, 12525 * idx, 1e-6)
  && gardeIdx.taux === 0.78 && gardeIdx.deduction === 0, gardeIdx);
const gardeNeg = C.fraisGarde({ ages: [3], fraisQc: -100, fraisFed: -50, revenuFamilial: 20000, revenuGagne: 10000 });
verifier("garde : frais négatifs, rien d'admissible", gardeNeg.admissibleQc === 0 && gardeNeg.creditQc === 0 && gardeNeg.deduction === 0, gardeNeg);
```

### Test 6 — Taux 0 % (réussit aujourd'hui)

À la suite du bloc 3. Le troisième cas a des intérêts après le renouvellement : ne pas exiger 0.

```javascript
/* 29. Taux 0 % : remboursement linéaire, marge qui ne bouge pas, puis renouvellement à 5 %. */
verifier("taux 0 : paiement et mois restants", C.tauxMensuel({ type: "hypotheque" }, 0) === 0
  && C.paiementPour(12000, 0, 12) === 1000 && C.moisRestants(12000, 0, 1000) === 12);
const pretNul = C.simulerDettes([{ id: "p", type: "pret", solde: 12000, taux: 0, paiement: 1000, frequence: "mois" }], { debut: "2026-01", methode: "minimum", moisMax: 24 });
verifier("taux 0 : libre en décembre 2026, sans intérêt", pretNul.iLibre === 11 && pretNul.interetsTotaux === 0
  && pretNul.libre.toISOString().slice(0, 10) === "2026-12-01" && !pretNul.dettes[0].premierRenouvellement);
const margeNulle = C.simulerDettes([{ id: "m", type: "marge", solde: 5000, taux: 0, paiement: 0, frequence: "mois", interetsSeulement: true }], { debut: "2026-01", methode: "minimum", moisMax: 12 });
verifier("taux 0 : marge en intérêts seulement, solde intact, jamais remboursée", margeNulle.interetsTotaux === 0 && margeNulle.mois[11].soldes[0] === 5000 && !margeNulle.libre);
const zeroPuis5 = { id: "h", type: "hypotheque", solde: 120000, taux: 0, paiement: 1000, frequence: "mois", interetsSeulement: false, finTerme: "2026-06-01", tauxRenouvellement: 5, dureeTerme: 5 };
const simZero = C.simulerDettes([zeroPuis5], { debut: "2026-01", methode: "minimum", moisMax: 24 });
const rz = simZero.dettes[0].premierRenouvellement;
const nZero = C.moisRestants(120000, 0, 1000);
const paiement5 = C.paiementPour(rz.solde, C.tauxMensuel({ type: "hypotheque" }, 5), nZero - 5);
verifier("taux 0 puis 5 % : cinq mois sans intérêt, paiement recalculé sur 115 000 $", rz.date.toISOString().slice(0, 10) === "2026-06-01"
  && rz.solde === 115000 && rz.paiement !== 1000 && proche(rz.paiement, paiement5, 1e-6) && simZero.interetsTotaux > 0, { solde: rz.solde, paiement: rz.paiement, paiement5 });
```

### Test 7 — `impotMixte` aux maximums (réussit aujourd'hui)

À la suite du bloc 23. Le salaire de 200 000 $ remplit les trois plafonds. Le revenu d'entreprise d'après ne les augmente plus. Le Fonds des services de santé, lui, suit le revenu d'entreprise.

```javascript
/* 30. Impôt mixte au-dessus des maximums RRQ, RQAP et assurance-emploi.
   Salaire d'abord : une fois les plafonds pleins, l'entreprise n'ajoute rien à ces trois cotisations. */
const plafond = C.P2026, qr = plafond.rrq, rs = plafond.rrqSalarie, rqa = plafond.rqap;
const rrqEmploye = (qr.mga - qr.exemption) * rs.base + (qr.mga - qr.exemption) * rs.supp1 + (qr.mgs - qr.mga) * rs.supp2;
const auPlafond = C.impotMixte({ salaire: 200000 });
verifier("plafonds : salarié à 200 000 $, RRQ, RQAP et assurance-emploi au maximum", proche(auPlafond.rrq, rrqEmploye, 1e-6)
  && proche(auPlafond.rqap, rqa.max * rqa.salarie, 1e-6) && proche(auPlafond.ae, plafond.ae.max * plafond.ae.taux, 1e-6), auPlafond);
const avecEntreprise = C.impotMixte({ salaire: 200000, revenu: 80000, depensesPro: 10000 });
verifier("plafonds : le revenu d'entreprise ne les dépasse pas ; le Fonds des services de santé suit l'entreprise", proche(avecEntreprise.rrq, auPlafond.rrq, 1e-6)
  && proche(avecEntreprise.rqap, auPlafond.rqap, 1e-6) && proche(avecEntreprise.ae, auPlafond.ae, 1e-6) && avecEntreprise.fss > auPlafond.fss, { seul: auPlafond.fss, avec: avecEntreprise.fss });
const autonome = C.impotMixte({ revenu: 200000 });
const rrqDeuxParts = (qr.mga - qr.exemption) * qr.base + (qr.mga - qr.exemption) * qr.supp1 + (qr.mgs - qr.mga) * qr.supp2;
verifier("plafonds : travailleur autonome, les deux parts jusqu'au MGA et au MGS", proche(autonome.rrq, rrqDeuxParts, 1e-6)
  && proche(autonome.rqap, rqa.max * rqa.autonome, 1e-6) && autonome.ae === 0, autonome);
```

### Test 8 — `transfertsConjoints` isolés (réussit aujourd'hui)

À la suite du bloc 1. L'ordre du tableau retourné est l'ordre des arguments. Deux revenus élevés et égaux ne se transfèrent rien.

```javascript
/* 31. Transferts entre conjoints, hors de la boucle officielle : qui reçoit, et dans quel ordre. */
const seulBas = C.impotSalarie({ salaire: 0 }), seulHaut = C.impotSalarie({ salaire: 120000 });
const [tBas, tHaut] = C.transfertsConjoints(seulBas, seulHaut);
verifier("transferts : le revenu nul ne reçoit rien, l'autre oui, et son impôt baisse", tBas.transferts === 0 && tHaut.transferts > 4000
  && proche(tHaut.transferts, 4576.52, 0.02) && tHaut.total < seulHaut.total, { transferts: tHaut.transferts, avant: seulHaut.total, apres: tHaut.total });
const [egauxA, egauxB] = C.transfertsConjoints(C.impotSalarie({ salaire: 90000 }), C.impotSalarie({ salaire: 90000 }));
verifier("transferts : deux salaires de 90 000 $, rien à transférer", egauxA.transferts === 0 && egauxB.transferts === 0);
const [ordreHaut, ordreBas] = C.transfertsConjoints(C.impotSalarie({ salaire: 120000 }), C.impotSalarie({ salaire: 15000 }));
verifier("transferts : l'ordre suit les arguments, le plus élevé reçoit", ordreHaut.revenu === 120000 && ordreBas.revenu === 15000
  && ordreBas.transferts === 0 && proche(ordreHaut.transferts, 878.56, 0.02), { haut: ordreHaut.transferts, bas: ordreBas.transferts });
```

### Test 9 — Thème, plan B, 320 px, CSV, bouton PDF (non exécuté)

Un seul scénario, ajouté à la ligne 972. Le thème est forcé au clair avant le clic, parce qu'un appareil déjà en sombre ferait l'inverse. Le plan B est le bouton « Créer un plan B » de `#pa-plans`, visible dans `#avenir/projection`. Les CSV sont des téléchargements (`acceptDownloads` est déjà vrai dans `ouvrir`). Le PDF stubbe `window.print` et compte les pages produites par le bouton, pas par un appel direct à `construire`.

```javascript
/* Parcours encore sans scénario : thème sombre, plan B, 320 px, deux CSV, rapport par le bouton. */
async function parcoursRestants(b, base) {
  const { ctx, p, erreurs } = await ouvrir(b, base, { largeur: 390 });
  await p.evaluate(() => { localStorage.setItem("wealthnord.theme", "light"); document.documentElement.dataset.theme = "light"; });
  await p.click("[data-bascule-theme]");
  await p.waitForTimeout(100);
  verifier("thème : le bouton passe au sombre et le garde", await p.evaluate(() => document.documentElement.dataset.theme === "dark" && localStorage.getItem("wealthnord.theme") === "dark"));
  await p.reload(); await pret(p);
  verifier("thème : sombre après rechargement", await p.evaluate(() => document.documentElement.dataset.theme === "dark"));

  await allerA(p, "avenir/projection");
  await p.getByRole("button", { name: "Créer un plan B" }).click();
  await p.waitForTimeout(300);
  const plan = await p.evaluate(() => ({ nom: window.Wealthnord.plan(), bandeau: !document.getElementById("bandeau-plan").hidden }));
  verifier("plan B : on le modifie, le bandeau le dit", plan.nom === "Plan B" && plan.bandeau, plan);
  await p.click("#bandeau-plan-sortir");
  await p.waitForTimeout(200);
  verifier("plan B : revenir au plan retire le bandeau", await p.evaluate(() => window.Wealthnord.plan() === null && document.getElementById("bandeau-plan").hidden));

  await p.setViewportSize({ width: 320, height: 700 });
  for (const page of ["apercu", "revenu", "impot", "budget", "avenir", "donnees"]) {
    await allerA(p, page);
    verifier(`320 px : ${page} sans défilement horizontal`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }

  await p.setViewportSize({ width: 390, height: 844 });
  await allerA(p, "donnees");
  const [tableur] = await Promise.all([p.waitForEvent("download"), p.click("#exporter-tableur")]);
  const csv = fs.readFileSync(await tableur.path(), "utf8");
  verifier("CSV : le tableur commence par WealthMorand et des points-virgules", csv.startsWith("\"WealthMorand\";") && csv.includes("Résumé"), csv.slice(0, 80));
  await allerA(p, "budget/dettes");
  const [planCsv] = await Promise.all([p.waitForEvent("download"), p.click("#exporter-plan")]);
  const dettesCsv = fs.readFileSync(await planCsv.path(), "utf8");
  verifier("CSV : le plan mois par mois a une colonne Total des dettes", dettesCsv.split("\n")[0].includes("Total des dettes"), dettesCsv.split("\n")[0]);

  await allerA(p, "donnees");
  await p.evaluate(() => { window.print = () => { window.__imprime = (window.__imprime || 0) + 1; }; });
  await p.click("#imprimer");
  await p.waitForTimeout(200);
  const pdf = await p.evaluate(() => ({ pages: document.querySelectorAll("#rapport .rp-page").length, imprime: window.__imprime || 0 }));
  verifier("PDF : le bouton prépare plusieurs pages et appelle l'impression", pdf.pages >= 5 && pdf.pages <= 8 && pdf.imprime === 1, pdf);
  verifier("parcours restants : aucune erreur", erreurs.length === 0, erreurs);
  await ctx.close();
}
```

`fs` est déjà déclaré en tête de `tests/navigateur.test.js`. Si le clic CSV ou le 320 px échoue, garder l'assertion et traiter l'échec comme un défaut, pas comme un test à assouplir.
