# Audit G — Qualité du code

Les sept fichiers de `js/` comptent 6 603 lignes (`app.js` 3 935, `calc.js` 950, `rapport.js` 644, `catalogues.js` 561, `interface.js` 309, `verrou.js` 198, `demarrage.js` 6). `calculer` en fait 390 à elle seule, `construire` 272.

Le plafond annuel du CELIAPP, 8 000 $, est écrit dans le README et dans l'aide du champ. Les deux calculs n'appliquent que le plafond à vie de 40 000 $. Une cotisation de 20 000 $ est donc déduite et projetée telle quelle.

Le commentaire de `simulerDettes` dit que le paiement ne change pas au renouvellement. Le code le recalcule, et le README aussi. Sur l'hypothèque du test existant, 1 200 $ deviennent 1 248,87 $, à l'écart 0 de la formule.

Le commentaire de `P2027` laisse la prime d'assurance médicaments à 2026. La ligne 85 indexe quand même les déductions. À 25 000 $ de revenu net, la prime passe de 368,64 $ à 318,54 $.

Aucune des 156 fonctions déclarées dans `app.js` n'est sans appel. `calculer` ne lit pas le DOM. Le découpage proposé plus bas n'est pas fait.

## Constats

| ID | Gravité | Fichier et ligne | Constat | Preuve | Correction proposée | Effort |
|---|---|---|---|---|---|---|
| G-01 | élevée | `js/app.js:513`, `js/calc.js:875` | Le CELIAPP n'a pas de plafond annuel. Les deux formules ne coupent qu'à 40 000 $ à vie. | README ligne 371, `js/catalogues.js:91` et `:482`, conseil à `js/app.js:2958`. Projection à rendement 0, cotisation 20 000 $ : soldes 0, 20 000, 40 000. | Une seule fonction, plafond `min(cotisation, 8 000, reste à vie)`, appelée par l'impôt et par la projection. Test H-01. | M |
| G-02 | moyenne | `js/app.js:453` | Quelques fonctions portent une page entière. `calculer` en fait 390. | Liste des 15 plus longues, plus bas. La flèche `champs` de `js/catalogues.js:314` en fait 216. | Le plan de découpage. Chaque étape reste vérifiable par les trois commandes. | L |
| G-03 | moyenne | `js/app.js:1197`, `js/rapport.js:90` | Les mêmes rangées sont écrites deux fois : écran et PDF, résumé et détail. | `pasJoli` identique (`js/interface.js:148`, `js/rapport.js:20`). Résidence, impôt de résidence, `COURT_MODE`, formule CELIAPP. | Au découpage, une fonction de rangées partagée par l'écran et le rapport. Le PDF peut attendre. | M |
| G-04 | moyenne | `js/calc.js:687` | Le commentaire dit que le paiement ne change pas au renouvellement. Le code le recalcule à la ligne 751. | README lignes 161 et 386. Test `tests/calculs.test.js:62` le dit aussi, sans vérifier le montant. Écart 0 avec `paiementPour`. | Réécrire le commentaire. Ne pas « corriger » le code pour le faire coller au commentaire. Test H-02. | S |
| G-05 | moyenne | `js/calc.js:71`, `js/calc.js:85` | Le commentaire laisse la prime médicaments à 2026. Les déductions sont indexées de 3,15 %. Maximum, seuil et taux ne le sont pas. | Déductions 2027 : 20 937, 33 937, 38 379, 33 937, 38 379, 42 484. Prime à 25 000 $ : 368,64 $ puis 318,54 $. À 50 000 $, 766 $ les deux années. | Vous choisissez : retirer la ligne 85, ou réécrire le commentaire. `P2027` reste provisoire. Test H-03. | S |
| G-06 | moyenne | `js/app.js:98`, `js/app.js:2025` | L'état `S`, le résultat `R` et `planActif` sont des variables de la fonction englobante. `tout` redessine les cinq pages. `utiliserAnnee` change `PAR` pour tout le moteur. | `R` est déclaré à la ligne 2025, après des fonctions qui le ferment. `calculerAvec` (`js/app.js:2432`) échange `S` le temps d'un calcul. | Le plan de découpage : `etat()` et `resultats()` déjà publics, rendu par page, `calculer(etat)` en dernier. | L |
| G-07 | faible | `js/app.js:3603`, `js/verrou.js:8`, `js/demarrage.js:4` | Le produit s'appelle WealthMorand. L'objet public s'appelle `Wealthnord`. Le stockage s'appelle `boussole.v1` et `wealthnord.theme`. | `js/rapport.js:7` et les tests lisent `window.Wealthnord`. Les clés sont lues au démarrage, avant le dessin. | Documenter les noms. Un renommage des clés exige une lecture de l'ancienne clé. Ne pas les renommer dans le découpage. | S |
| G-08 | faible | `js/calc.js:169`, `js/calc.js:607`, `js/calc.js:612` | Trois exports ne sont jamais lus. `indexQc` n'a aucun appelant. | `PRISE_EN_CHARGE`, `tauxMarginal`, `remboursementReer`. L'app recalcule le taux marginal (`js/app.js:580`) et le remboursement REER (`js/app.js:599`). | Les retirer de l'objet `Calc`, ou les appeler à la place du second calcul. `indexQc` : le passer, ou le dire inutilisé. | S |

### G-01 — Plafond annuel du CELIAPP

Les commentaires du code ne parlent que du plafond à vie :

```510:513:js/app.js
    // CELIAPP : cotisations jusqu'au plafond à vie de 40 000 $ ; déductibles comme le REER.
    const ca = S.epargne.celiapp || { solde: 0, cotisationAnnuelle: 0 };
    const dejaCeliapp = ca.cotisationsVersees != null && ca.cotisationsVersees !== "" ? +ca.cotisationsVersees || 0 : ca.solde || 0;
    R.celiappAnnee = a => Math.min(ca.cotisationAnnuelle || 0, Math.max(0, 40000 - dejaCeliapp - a * (ca.cotisationAnnuelle || 0)));
```

```843:846:js/calc.js
    // CELIAPP : cotisations jusqu'au plafond à vie (40 000 $), croissance à l'abri de l'impôt.
    const ca = o.celiapp || { solde: 0, cotisationAnnuelle: 0 };
    // Plafond à vie : sur les cotisations versées à ce jour ; à défaut, le solde (qui comprend les gains).
    let celiapp = ca.solde || 0, cumulCeliapp = ca.cotisationsVersees != null && ca.cotisationsVersees !== "" ? +ca.cotisationsVersees || 0 : ca.solde || 0;
```

La cotisation de l'année, dans la projection, est la ligne 875 : `Math.min(ca.cotisationAnnuelle || 0, Math.max(0, 40000 - cumulCeliapp))`, versée quand `k % 12 === 0`.

Le README, ligne 371, écrit « 8 000 $ par année, 40 000 $ à vie (Agence du revenu du Canada) ». La même phrase est le commentaire de l'exemple (`js/catalogues.js:91`) et l'aide du champ (`js/catalogues.js:482`). Le conseil « où mettre le prochain 1 000 $ » (`js/app.js:2958`) n'offre le CELIAPP que si la cotisation inscrite est sous 8 000 $. Il ne plafonne pas le calcul. Une cotisation de 20 000 $ disparaît donc du conseil et reste déduite dans l'impôt.

Preuve, rendement 0, cotisations versées 0, cotisation annuelle 20 000 $, `projeterValeurNette` : soldes du CELIAPP par année d'indice 0 à 6 : 0, 20 000, 40 000, 40 000, 40 000, 40 000, 40 000. Avec un plafond de 8 000 $, l'indice 1 serait 8 000 et l'indice 5 atteindrait 40 000. `R.celiappAnnee(0)` à `R.celiappAnnee(5)` donnent aujourd'hui 20 000, 20 000, 0, 0, 0, 0.

Les deux sites sont d'accord entre eux. Le correctif doit les remplacer par un seul calcul, puis H-01. Effort M : deux sites, les tests, et la phrase d'aide déjà juste.

### G-02 — Fonctions longues

Les longueurs sont inclusives (ligne de début et ligne de fin). Un compteur d'accolades dans `/tmp` s'est trompé sur les gabarits (`${…}` dans les chaînes du rapport) : `resumeImpot` semblait aller jusqu'à la fin du fichier. Les chiffres ci-dessous viennent de l'arbre syntaxique (acorn, déjà utilisé par ESLint). Les racines des fonctions englobantes ne sont pas dans la liste.

| Fonction | Fichier et début | Lignes | Fin |
|---|---|---|---|
| `calculer` | `js/app.js:453` | 390 | 842 |
| `construire` | `js/rapport.js:144` | 272 | 415 |
| `revenuGmfu` | `js/calc.js:263` | 153 | 415 |
| `rendreApercu` | `js/app.js:951` | 115 | 1065 |
| `rendreBudget` | `js/app.js:1750` | 112 | 1861 |
| `comptable` | `js/rapport.js:526` | 108 | 633 |
| `rendreAvenir` | `js/app.js:1909` | 104 | 2012 |
| `simulerDettes` | `js/calc.js:712` | 96 | 807 |
| `rendreRevenu` | `js/app.js:1221` | 94 | 1314 |
| `projeterValeurNette` | `js/calc.js:836` | 87 | 922 |
| `rendreImpot` | `js/app.js:1566` | 83 | 1648 |
| `graphiqueLignes` | `js/interface.js:153` | 73 | 225 |
| `rendreVerrou` | `js/app.js:3477` | 66 | 3542 |
| `rendreFamille` | `js/app.js:1650` | 57 | 1706 |
| `portraitDepuis` | `js/app.js:3858` | 54 | 3911 |

`comptableResidence` (`js/rapport.js:472`) fait aussi 54 lignes. Dans `calculer`, la flèche `anneeParcours` (`js/app.js:685`) en fait 43. La flèche `champs` (`js/catalogues.js:314` à `529`) en fait 216 : c'est le troisième bloc du dépôt si on compte les flèches. `app.js` déclare 156 fonctions. Chacune a au moins un autre emploi de son nom.

### G-03 — Duplication

`pasJoli` est le même bloc dans `js/interface.js:148-152` et `js/rapport.js:20-24`. Deux moteurs de graphique coexistent : `graphiqueLignes` (`js/interface.js:153`) et `lignes` (`js/rapport.js:26`, 40 lignes).

`pageResidence` (`js/rapport.js:90-111`) reprend les rangées de `rendreResidence` (`js/app.js:1208-1217`) et la note FMRQ (`js/app.js:1218-1219`, `js/rapport.js:110`). `pageImpotResidence` (`js/rapport.js:112-140`) reprend `morceauxImpot` (`js/app.js:1494-1498`) et le tableau de `rendreImpotResidence` (`js/app.js:1546-1563`). `resumeImpot` (`js/app.js:1507-1527`) répète les rangées de paie de `rendreImpotResidence` (`js/app.js:1538-1543`).

`anneeParcours` et `annee` (`js/app.js:728`) assemblent deux fois l'impôt, la famille, la prime et la garde. `COURT_MODE` est déclaré dans `js/app.js:1155` et `js/rapport.js:17`. `moins` existe dans `js/interface.js:142` et `js/rapport.js:16` (le rapport écrit un tiret sous 0,50 $). La formule CELIAPP est le cas G-01.

### G-04 — Commentaire du renouvellement

```687:687:js/calc.js
     Au renouvellement, le paiement ne change pas : seul le taux change. */
```

```748:752:js/calc.js
        if (d.auRenouvellement) {
          d.tauxCourant = Math.max(0, (d.tauxRenouvellement || d.taux) + ecart);
          // Nouveau paiement : même amortissement restant, au nouveau taux.
          if (isFinite(d.nRestant) && d.nRestant > 0) d.paiementMensuel = paiementPour(d.s, tauxMensuel(d, d.tauxCourant), d.nRestant);
```

Le commentaire de la ligne 724 est juste : l'amortissement restant est gardé, il n'est pas rallongé. Le README, lignes 161 et 386, dit que le paiement est recalculé. Le test (`tests/calculs.test.js:62-64`) le dit aussi, puis ne vérifie que `r.taux === 4.5` et l'année 2028.

Preuve, la dette « Hypothèque » du test (solde 200 000 $, taux 4 %, paiement 1 200 $, fin de terme 2028-06-01, taux de renouvellement 4,5 %, début 2026-11, méthode `minimum`) : renouvellement le 2028-06-01, taux 4,5 %, solde 189 452,00 $, paiement 1 248,87 $. Mois d'indice 19. Amortissement au départ 242,60 mois, reste 223,60. `paiementPour` sur ce solde, ce taux et ce reste donne le même paiement, écart 0. Le code a raison. Le commentaire de la ligne 687 a tort. Le changer est un effort S. Changer le code pour obéir au commentaire figerait le paiement, et le test actuel resterait vert (H-02).

### G-05 — Commentaire de P2027 et prime médicaments

```71:72:js/calc.js
     Ce qui ne suit pas cet indice reste à 2026 en attendant : RRQ, RQAP, prime d'assurance médicaments,
     Allocation canadienne pour enfants (indexée en juillet). Tout sera remplacé par les montants officiels. */
```

```83:88:js/calc.js
    p.fss.seuil2 = cinq(p.fss.seuil2, q);
    for (const k of ["max", "min", "seuilCouple", "seuilMono", "monoMax", "monoMin", "fournitures"]) p.allocationFamille[k] = dollar(p.allocationFamille[k], q);
    for (const k of Object.keys(p.medicaments.deductions)) p.medicaments.deductions[k] = dollar(p.medicaments.deductions[k], q);
    p.garde.quebec.moins7 = cinq(p.garde.quebec.moins7, q); p.garde.quebec.autres = cinq(p.garde.quebec.autres, q);
    p.garde.quebec.taux = p.garde.quebec.taux.map(([seuil, taux]) => [cinq(seuil, q), taux]);
    p.ae = { max: 70800, taux: 0.0127 };
```

Ce qui colle au commentaire : objets `rrq`, `rqap` et `ace` identiques à 2026. Maximum médicaments 766 $, seuil 5 000 $, taux seul 7,84 % et 11,76 %, taux couple 3,93 % et 5,89 %, inchangés. Assurance-emploi écrite à part : 70 800 $ et 1,27 %. Crédit québécois pour dividendes : 2,69 %.

Ce qui ne colle pas : les six déductions médicaments. 2026 : 20 298, 32 901, 37 207, 32 901, 37 207, 41 187. 2027, au dollar après 3,15 % : 20 937, 33 937, 38 379, 33 937, 38 379, 42 484. Prime d'une personne seule, un adulte :

| Revenu net | 2026 | 2027 |
|---|---|---|
| 20 500 $ | 15,84 $ | 0 $ |
| 25 000 $ | 368,64 $ | 318,54 $ |
| 50 000 $ | 766 $ | 766 $ |

Près de la déduction, l'écart est de quelques dizaines de dollars. Au plafond, il est nul. `P2027` est marqué provisoire (`provisoire: true`).

Dans le même bloc, `fss.seuil2` seul est indexé : 64 355 $ devient 66 380 $. `seuil1` 18 500 $, palier 150 $, maximum 1 000 $ et taux 1 % restent à 2026. L'allocation famille est indexée en entier (maximum 3 068 $ → 3 165 $). Les plafonds de garde du Québec le sont (moins de 7 ans : 12 525 $ → 12 920 $). Le fédéral de la garde ne l'est pas. Le commentaire ne dit rien de ce partage. La question pour vous porte sur la ligne 85 d'abord, et sur `seuil2` ensuite.

### G-06 — Couplage

`S` est créé à la ligne 98, `planActif` à la ligne 100. `R` est déclaré à la ligne 2025, au milieu du fichier. Les fonctions du dessus le ferment et ne s'exécutent qu'après. `calculer` (lignes 453 à 842) lit `S`, construit un `R` local et le retourne. `tout` (ligne 2041) fait `R = calculer()` puis appelle les six `rendre*`. `calculerAvec` (ligne 2432) remplace `S` le temps du calcul, puis rappelle `utiliserAnnee`.

`utiliserAnnee` (`js/calc.js:97-99`) écrit le paramètre d'année `PAR`, lu par tout le moteur. `avecAnnee` le restaure. Les tests s'en servent. Un découpage qui rendrait `calculer` pur doit garder ce comportement, ou les 202 réussites changent de sens.

`calculer` ne contient ni `getElementById` ni `querySelector`. Le premier accès au DOM après son `return` est `changer`, ligne 845. `js/calc.js` n'accède pas à la page : l'en-tête du fichier le dit, et la lecture le confirme. Le couplage est l'état partagé et `PAR`, pas le DOM dans le calcul.

### G-07 — Noms

`window.Wealthnord` est publié à `js/app.js:3603` (`etat`, `resultats`, `plan`, `verification`, `outils`). `js/rapport.js:7` s'arrête si cet objet manque. Les tests attendent `window.Wealthnord.resultats()`. Le titre de la page, le manifeste et le texte visible disent WealthMorand.

La clé de stockage est `boussole.v1` (`js/app.js:8`, `js/verrou.js:8`). Le thème est `wealthnord.theme` (`js/demarrage.js:4`, `js/app.js:3561`). `demarrage.js` les lit avant le premier dessin, dans le `head`. Renommer une clé sans lire l'ancienne perd le portrait ou le thème au prochain chargement. L'effort S est de le documenter. L'effort d'un vrai renommage est M, avec migration, et ce n'est pas le découpage.

### G-08 — Exports sans lecteur

L'objet `Calc` (`js/calc.js:946-947`) a 48 noms. Trois ne sont lus nulle part après leur définition et leur export :

- `PRISE_EN_CHARGE` (`js/calc.js:169`). Les tarifs de prise en charge viennent de `TARIFS_LIEU` et de `montantsLieu`.
- `tauxMarginal` (`js/calc.js:607`). L'app refait le quotient sur 1 000 $ à `js/app.js:580-582`.
- `remboursementReer` (`js/calc.js:612`). L'app refait la différence d'impôt à `js/app.js:599`.

`impotDividendes` (`js/calc.js:617`) est appelé par `comparerSociete` (`js/calc.js:662` et `665`). `comparerSociete` est appelé une fois (`js/app.js:839`). Ils ne sont pas morts. `VISITES`, `TARIFS_DEFAUT` et `ACTIVITES_POLYVALENTES` servent dans `calc.js`. `parametresActifs` ne sert que dans `tests/calculs.test.js:327` : c'est le crochet du test, pas du code mort.

`indexQc` (`js/calc.js:937`) est lu trois fois dans `fraisGarde` et n'est passé par aucun appel. L'app multiplie le crédit par le facteur d'inflation `I` après l'appel (`js/app.js:723` et `754`), sans `indexQc`. Les plafonds de 2027, eux, sont arrondis au multiple de 5 $ dans `P2027`. `indexQc: 1,0315` sur les paramètres 2026 donne 12 919,54 $, pas 12 920 $.

## Vérifié et trouvé correct

Le moteur de `js/calc.js` ne touche pas la page. `calculer` non plus. Les 156 fonctions d'`app.js` ont toutes au moins un appel. Le paiement au renouvellement suit `paiementPour` sur l'amortissement restant, écart 0, comme le README. RRQ, RQAP et allocation canadienne pour enfants de `P2027` sont bien ceux de 2026. L'assurance-emploi 2027 est écrite à 70 800 $ et 1,27 %, pas par l'indice. Les deux formules CELIAPP se concordent (plafond à vie seulement). `eslint.config.js` impose `no-implicit-globals` et `sourceType: "script"` : un fichier nouveau doit être une fonction englobante, pas un module. La politique de contenu (`index.html:6`) autorise déjà `script-src 'self'`. `window.WM.catalogues` et `window.WM.interface` existent. Le style du dépôt est des fonctions, pas des classes.

La suite complète n'a pas été relancée. Le départ donné tient : ESLint sans erreur, 202 réussites aux calculs, écart maximal 40 $ avec l'outil officiel, 235 réussites au navigateur et 0 échec (`/tmp/navigateur-depart.txt`).

## Questions

1. Pour 2027, encore provisoire : gardez-vous les déductions médicaments indexées (et on réécrit le commentaire des lignes 71-72), ou les laissez-vous à 2026 (et on retire la ligne 85) ? La même question vaut pour `fss.seuil2` seul (64 355 $ → 66 380 $).
2. Une cotisation CELIAPP au-dessus de 8 000 $ doit-elle être ramenée à 8 000 $ dans l'impôt et dans la projection, ou seulement signalée, le montant inscrit restant celui du calcul ?
3. Souhaitez-vous un jour renommer `Wealthnord`, `boussole.v1` et `wealthnord.theme` ? Le stockage actuel devrait être lu encore, sinon le portrait déjà sur l'appareil disparaît.
4. Les tests H-01 et H-03 échouent sur le code d'aujourd'hui. Les ajouter tels quels fait échouer la suite jusqu'au correctif. Est-ce le contrat que vous voulez ?

## Plan de découpage

Aucun fichier de code n'est déplacé ici. Chaque étape ci-dessous est un changement à part, vert avant la suivante. Les trois commandes, à chaque étape :

```text
npx eslint .
node tests/calculs.test.js
node tests/navigateur.test.js
```

### Contraintes qui ne bougent pas

Pas d'outil de construction, pas de module, pas de classe. Chaque fichier nouveau est une fonction englobante, comme `js/calc.js` et `js/verrou.js`, à cause de `no-implicit-globals`. Les fonctions de page s'enregistrent sur `window.WM.app` (ou un nom déjà préfixé `WM`). `window.WM` existe déjà pour les catalogues et l'interface.

`window.Wealthnord` reste. `js/rapport.js:7` et `tests/navigateur.test.js` (`pret`, ligne 51) s'arrêtent sans lui. Le découpage publie les mêmes cinq membres : `etat`, `resultats`, `plan`, `verification`, `outils`.

`js/demarrage.js` reste la première balise, dans le `head` (`index.html:26`). Il peint le thème, l'ouverture et le verrou avant le reste. On ne le fusionne pas.

La politique de contenu n'a pas à changer : `script-src 'self'` (`index.html:6`) autorise un script de la même origine. Aucun script en ligne. Les fichiers nouveaux sont des balises `script src`, classiques, pas `type="module"`.

`sw.js` : la constante `CACHE` reste `"wealthmorand-v52"`. On ne propose pas de la monter. À l'étape qui ajoute un fichier, on ajoute son chemin dans `FICHIERS` (lignes 5 à 8), dans le même changement que la balise. Le navigateur réinstalle le worker parce que les octets de `sw.js` ont changé. Le même nom de cache fait `addAll` des nouvelles adresses et garde les anciennes. L'intégrateur montera le numéro à la publication, comme le dit `AGENTS.md`.

Ordre visé des balises, une fois le découpage fini. Tant qu'une page n'est pas extraite, sa fonction reste dans `app.js` et la balise n'existe pas :

```text
js/demarrage.js          (head, inchangé)
js/calc.js
js/verrou.js
js/catalogues.js
js/interface.js
js/app.js                (état, calculer, navigation, tout)
js/feuilles.js           (étape 9, avant les pages qui ouvrent un panneau)
js/page-apercu.js
js/page-revenu.js
js/page-impot.js
js/page-budget.js
js/page-patrimoine.js
js/page-donnees.js
js/assistant.js
js/lancement.js          (ouvrir, avancer, tout, assistant automatique)
js/rapport.js
```

`js/lancement.js` est après les pages et avant le rapport. Aujourd'hui, le bloc des lignes 3918 à 3934 de `app.js` tourne pendant la lecture du fichier, donc avant `rapport.js`. Le garder dans un fichier chargé trop tôt appelle `tout` avant que les pages soient enregistrées. Le rapport, lui, s'accroche à `Verrou.quandOuvert` et n'est pas nécessaire à `tout`.

Les pages ne ferment plus les `let` de `app.js`. Elles lisent `WM.app.etat()` et `WM.app.resultats()`, et appellent `WM.app.calculer` tant que le calcul n'est pas extrait. `tout` appelle `WM.app.rendreApercu` et les autres, même quand la fonction est encore posée par `app.js`. Extraire une page devient alors un déplacement d'affectation, pas une chasse aux fermetures.

### Étape 1 — Espace de noms et démarrage

Dans `app.js`, créer `window.WM.app` et y poser `etat`, `resultats`, `calculer`, `tout`, `ouvrir`, et les `rendre*` encore locaux. Déplacer seulement les lignes 3918 à 3934 dans `js/lancement.js`, qui appelle ces fonctions. Ajouter la balise après `app.js` et avant `rapport.js`, et le chemin dans `FICHIERS`. `Wealthnord` continue de pointer les mêmes fonctions. Vérifier les trois commandes. Si une page est blanche, le bloc de démarrage a été lu avant l'enregistrement.

### Étape 2 — Aperçu

Déplacer le rendu de l'aperçu, environ les lignes 867 à 1169 (`rendreApercu` et ce qu'elle est seule à appeler), vers `js/page-apercu.js`. La fonction s'enregistre sur `WM.app`. `tout` ne change pas d'ordre d'appel. Balise et `FICHIERS`. Trois commandes. Le scénario `exemple` et `apercuCoherent` suffisent pour voir la page ; la suite complète reste la barre de l'étape.

### Étape 3 — Revenu

Même geste pour le revenu, environ 1173 à 1482 (`rendreRevenu`, résidence, activités). Scénarios utiles ensuite : `brochure`, `lexiqueRamq`, `residence`, `enteteEtChamps`.

### Étape 4 — Impôt

Environ 1485 à 1748 : `morceauxImpot`, `resumeImpot`, `rendreImpot`, `rendreImpotResidence`, `rendreFamille`. Scénarios : `acomptesCeliapp`, `fraisGardeMenage`, `residence`.

### Étape 5 — Budget

`rendreBudget` (1750) et les rendus de trésorerie et de dettes qui ne servent qu'au budget. Laisser `tout` dans `app.js`. Le chevauchement avec le patrimoine commence vers 2421 : ne déplacer une fonction que si un seul écran l'appelle. Scénario `budget`.

### Étape 6 — Patrimoine

`rendreAvenir` (1909) et les plans (2421 à 3024, dont `rendrePlans` à 2493 et `optionsProchain` à 2951). `calculerAvec` et `planActif` restent dans `app.js` : les deux plans doivent voir le même état. Scénarios : `monteCarlo`, `repartition`, `rendementProfil`, `planCalendrier`.

### Étape 7 — Données

Restauration, transfert, thème, installation, export CSV (`exporterTableur` à 2240, CSV des dettes à 3584). Le chiffrement reste dans `verrou.js`. `rendreVerrou` (3477) peut suivre cette étape ou rester, au choix, mais il appelle `Verrou` et non un calcul. Scénarios : `verrou`, `verrouDelai`, `verrouOnglets`, `transfert`, `sauvegarde`, `nouvelleVersion`.

### Étape 8 — Assistant

Lignes 3680 à 3916 (`portraitDepuis` à 3858, `terminerAssistant`). `lancement.js` reste le seul à décider de l'ouverture automatique. Scénario `assistantMode`. L'assistant au premier lancement, lui, n'a pas de test (audit H) : le vérifier à la main sur cette étape, avec un stockage vide et sans `wm.assistant`.

### Étape 9 — Panneaux Modifier

La machinerie générique, environ les lignes 117 à 417 (`creerChamp`, `FEUILLES` à 235), vers `js/feuilles.js`, chargé avant les pages qui ouvrent un panneau. Les boutons `data-feuille` restent dans `index.html`. Scénarios : `brochure`, `alertes`, `lexiqueRamq`.

### Étape 10 — `calculer`, en dernier

Extraire `calculer` vers `js/menage.js`, chargé après `calc.js` et avant `app.js`, avec la signature `calculer(etat)`. Le fichier ne lit pas le DOM et ne ferme pas `S` : l'état est l'argument, le résultat est le retour. `utiliserAnnee` et `PAR` restent le point délicat. `calculerAvec` doit encore remettre l'année de `S` au retour. Cette étape est la seule qui peut faire bouger un montant : `node tests/calculs.test.js` est alors la vérification principale, pas seulement le navigateur. On ne la fait pas avant que les pages lisent `resultats()` au lieu de fermer `R`.

Hors de ce plan, plus tard : couper la flèche `champs` (`js/catalogues.js:314`, 216 lignes) par panneau. Ce n'est pas `app.js`, et les pages s'en servent déjà via `window.WM.catalogues`.

Ce qu'on ne fait pas dans ces étapes : monter `CACHE`, éditer la politique de contenu, renommer `Wealthnord` ou les clés de stockage, fusionner `demarrage.js`, introduire un chargeur.
