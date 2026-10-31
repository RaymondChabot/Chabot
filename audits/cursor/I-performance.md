# I — Performance

Mesures du 31 octobre 2026, Chromium headless (Playwright), fenêtre 390 × 844, locale fr-CA, `http://127.0.0.1:8767/`. Processeur ralenti 4 fois (`Emulation.setCPUThrottlingRate`, taux 4). Avant chargement : `localStorage["wm.assistant"] = "1"`, `sessionStorage["wm.ouverture"] = "1"`. Données : l'exemple fictif du catalogue (une marge, horizon 20 ans). Travailleur de service bloqué, pour mesurer les scripts et non le cache. Cinq essais, médiane = 3e valeur triée. Aucun fichier de l'application n'a été modifié. Les durées viennent de l'application telle quelle. Les comptes d'appels viennent de compteurs ajoutés seulement dans la copie servie au navigateur de mesure.

## 1. Résumé

Au processeur ralenti 4 fois, le premier montant en dollars de l'Aperçu paraît en 388 ms ; la réponse réseau est à 3 ms, l'attente est le fil principal.
Chaque navigation passe par `ouvrir` puis `tout` : un recalcul et le redessin des six pages, médianes de 55 ms (Données) à 112 ms (Patrimoine, résumé).
`calculer()` ne dure qu'environ 8 ms (six simulations de dettes, sept projections) ; le temps est dans le rendu, au premier chef les graphiques SVG.
Une frappe rappelle `calculer()` une seule fois, 120 ms plus tard (blocage de 60 ms, chiffre engagé en 195 ms) ; cinq frappes rapides restent une seule passe. Les 300 projections du Monte Carlo ne partent que si Patrimoine est à l'écran, y compris au résumé où la carte est cachée (307 projections au lieu de 7, environ 17 ms).
Un graphique caché mesure 0 px et est dessiné à 600 px, puis réécrit à 324 px quand il s'affiche : c'est pour cela que tout est redessiné. N'afficher que la page visible, et ne dessiner un graphique que si son conteneur a une largeur, ramènerait la navigation Revenu (détail) d'environ 98 ms à environ 30 ms (estimation).

## 2. Constats

| Id | Gravité | Fichier et ligne | Constat | Preuve | Correction | Effort |
|---|---|---|---|---|---|---|
| I-01 | élevée | `js/app.js:3225`, `js/app.js:2041`, `js/app.js:453` | Chaque navigation et chaque frappe (après le délai) exécutent `tout()`, qui appelle `calculer()` puis `rendreApercu`, `rendreRevenu`, `rendreImpot`, `rendreBudget`, `rendreAvenir` et `rendreFiabilite`, que la page soit affichée ou non. Au réglage « téléphone lent », presque toutes les navigations dépassent 50 ms sur le fil principal. | Médianes : démarrage 388 ms ; navigation 55 à 112 ms (tableau de la section 5). Profil d'un passage vers le détail Patrimoine : `ouvrir` 109 ms inclusifs, `tout` 107 ms, `calculer` 8 ms. Profil vers le détail Revenu : `tout` 95 ms, dont `rendreApercu` 28, `rendreBudget` 26, `rendreRevenu` 11, `rendreAvenir` 8, `rendreImpot` 3, `calculer` 7. Comptes : 1 `tout` et 1 `calculer` par navigation ; les six fonctions `rendre*` partent à chaque fois. | Séparer le recalcul du rendu. Étapes en bas de ce constat. Avant (mesuré) et après (estimation) : Revenu détail 98 → environ 30 ms ; Patrimoine résumé 112 → environ 35 ms ; Données 56 → environ 20 ms ; frappe, blocage 60 → environ 20 ms ; frappe, chiffre engagé 195 → environ 155 ms ; démarrage 388 → environ 320 ms. | M |
| I-02 | moyenne | `js/interface.js:159`, `js/app.js:2045`, `js/app.js:3933` | `graphiqueLignes` prend `Math.max(260, boite.clientWidth \|\| 600)`. Une page `[hidden]`, une carte `.detail-seul` masquée ou une carte `.hors-onglet` a une largeur 0, donc le dessin part à 600 px. Au prochain affichage, `tout()` redessine pour mesurer le conteneur réel (324 px dans une fenêtre de 390 px). Un graphique déjà juste est réécrit à 600 px dès qu'on quitte sa page. | Après un rendu complet sur `#apercu` : `#ap-graph-dettes`, `#rv-sens-graph`, `#vn-graph` et le graphique du résumé Patrimoine ont `clientWidth` 0 et `svg width="600"`. Sur `#apercu/detail`, le graphique des dettes passe à 324 / 324, et celui du revenu reste à 600. Sur `#revenu/detail`, c'est l'inverse (sensibilité 324, dettes revenues à 600). Sur `#avenir`, le résumé est à 324 et `#vn-graph` à 600. Sur `#avenir/projection`, `#vn-graph` et `#pa-chances` sont à 324, le résumé revient à 600. | Ne plus remplacer une largeur 0 par 600. Étapes au constat I-01, point 4. Un `viewBox` fixe avec `width: 100 %` éviterait la mesure, mais la densité des étiquettes (`iw / 44`) et la hauteur (`W < 480`) resteraient celles du premier dessin. | S (avec I-01) |
| I-03 | moyenne | `js/app.js:818`, `js/app.js:2271` | Les 300 avenirs sont synchrones sur le fil principal, dans `rendreChances`, appelé par `rendreAvenir` à chaque `tout()`. Le garde-fou regarde seulement si `#v-avenir` est cachée. Dès que la page Patrimoine est ouverte, le calcul part : au résumé, et sur un sous-onglet autre que Projection, alors que `#pa-chances` est dans `.detail-seul` et `data-sous="projection"`. Hors de cette page, il ne part pas. Sur l'exemple, ce n'est pas le poste dominant (environ 17 ms inclusifs sur un `tout` de 107 ms). | Comptes : vers Revenu ou Aperçu, `monteCarlo` 0 et `projeterValeurNette` 7 ; vers Patrimoine, `monteCarlo` 1 et `projeterValeurNette` 307. Les 7 de base sont les 4 méthodes de dettes plus les 3 scénarios (`js/app.js:803` et `js/app.js:807`). Profil Patrimoine : `R.monteCarlo` 17 ms inclusifs (3 ms en propre), `rendreChances` 30 ms, `projeterValeurNette` 13 ms en propre pour l'ensemble des appels. Au résumé `#avenir`, `#pa-chances` a un SVG à 600 px alors que la carte est masquée. | Lancer `monteCarlo(300)` seulement quand `#pa-chances` est affichée (pas `.hors-onglet`, pas `.detail-seul` dans un résumé, `clientWidth > 0`). Le résultat peut attendre la frame où la carte s'ouvre. Les 7 projections du plan restent dans `calculer()`, elles sont peu coûteuses sur l'exemple. | S |
| I-04 | faible | `js/app.js:2046` (rendu qui reconstruit le DOM) | Après un passage deux fois sur les douze adresses (résumé et détail), le tas JS retenu, mesuré après un ramasse-miettes, monte d'environ 1,3 Mo. Ce n'est pas une fuite démontrée : l'instantané des rétentions n'a pas été pris. | `Performance.getMetrics`, `JSHeapUsedSize`, après `HeapProfiler.collectGarbage`. Cinq démarrages à froid : médiane 2 776 380 octets. Même session, avant la tournée 2 781 084 octets, après 4 057 752 octets (+1 276 668). | Prendre un instantané du tas (objets retenus) avant d'en faire un correctif. Pistes à vérifier seulement si l'instantané les montre : nœuds détachés par le hero animé, écouteurs recréés, chaînes SVG. | S |

### I-01 — pourquoi tout est redessiné, et comment n'afficher que la page visible

`hashchange` appelle `ouvrir` (`js/app.js:3229`). `ouvrir` cache les autres `.vue`, puis appelle `tout()` dès que `R` existe (`js/app.js:3225`), avec le commentaire « les graphiques prennent la largeur de la page visible ». `tout()` (`js/app.js:2041`) fait toujours, dans l'ordre : `calculer()` ; `appliquerSous("budget")` et `appliquerSous("avenir")`, qui posent `.hors-onglet` sur les cartes des autres sous-onglets ; les six rendus. Le changement de sous-onglet rappelle aussi `tout()` (`js/app.js:3200`). Au chargement, `ouvrir(..., true)` saute un premier rendu, puis un seul `tout()` suit (`js/app.js:3919` et `js/app.js:3921`).

`calculer()` (`js/app.js:453`) reconstruit l'impôt, lance `simulerDettes` une fois par méthode (4) et une fois par scénario qui n'est pas celui en cours (2 de plus, 6 en tout), puis `projeterValeurNette` pour les 4 méthodes et les 3 scénarios (7). Il prépare `monteCarlo` sans l'exécuter. L'exécution des 300 avenirs est dans le rendu (I-03). Sur l'exemple, tout `calculer()` pèse environ 7 à 8 ms inclusifs au processeur ralenti 4 fois. Le rendu des pages cachées pèse plusieurs fois plus.

Étapes, sans patch :

1. Scinder `tout()` en `recalculer()` (`calculer()`, puis marquer toutes les pages sales) et `afficher(page)`.
2. `ouvrir` et le changement de sous-onglet, quand les données n'ont pas changé, n'appellent pas `calculer()`. Ils appellent `afficher` pour la seule page ouverte, et seulement si elle est sale ou si un de ses graphiques visibles a été mesuré à 0 px.
3. Une frappe continue de passer par `plusTard` (`js/app.js:3086`, 120 ms) : un `recalculer()`, puis `afficher` de la page ouverte et la mise à jour du panneau. Pas les cinq autres pages.
4. Graphiques. Dans `graphiqueLignes`, si `clientWidth === 0`, ne pas dessiner et ne pas poser `width="600"`. Garder sur le conteneur les séries déjà calculées. Dessiner quand le conteneur devient visible et a une largeur. Le `ResizeObserver` déjà posé sur `main` (`js/app.js:3933`) rappelle aujourd'hui `tout()` dès que la largeur change de plus de 4 px : le limiter aux `.graphique` de la page affichée, pour redessiner ceux dont la largeur passe de 0 à une valeur réelle, ou change de plus de 4 px. Les pages cachées restent à largeur 0 sans recevoir un SVG de 600 px. Les pages affichées sont mesurées dans un conteneur réel (324 px observés à 390 px de fenêtre).
5. `viewBox` peut accompagner l'observateur (`width="100%"`, `preserveAspectRatio`), pour que le trait suive la carte. Il ne remplace pas l'observateur : le pas des étiquettes et le choix de hauteur dépendent de la largeur en pixels. Redessiner seulement quand cette largeur change assez pour ce pas.
6. Réserver `monteCarlo(300)` à l'affichage réel de `#pa-chances` (I-03).

Les estimations partent du profil vers le détail Revenu (navigation de ce passage : 107 ms ; `tout` 95 ms). Retirer `rendreApercu` (28), `rendreBudget` (26), `rendreAvenir` (8) et `rendreImpot` (3) laisse `rendreRevenu` (11), le châssis de `ouvrir` (environ 2 ms) et le reliquat jusqu'aux deux frames (environ 12 ms), soit environ 25 ms, arrondis à 30 ms. Pour le résumé Patrimoine, retirer les autres pages et `rendreChances` (30 ms, carte cachée) laisse de l'ordre de 35 ms. Pour une frappe sur Revenu, le blocage mesuré de 60 ms deviendrait `calculer` (environ 8) plus `rendreRevenu` (11), soit environ 20 ms ; le chiffre engagé, aujourd'hui 195 ms, garderait le délai de 120 ms, soit environ 155 ms. Le démarrage (388 ms) est surtout l'analyse des scripts ; n'y rendre que l'Aperçu enlève le rendu des autres pages, de l'ordre de 60 ms, soit environ 320 ms. Ces après sont des estimations, pas des mesures.

### Saisie, dettes, projection, Monte Carlo

Le champ mesuré est « Demi-journées de rendez-vous par semaine » (`revenu.demiJournees`), panneau Modifier de la page Revenu. L'exemple part de 7 ; les cinq essais ont posé 8, 7, 6, 5 et 4. À chaque essai, `dataset.nombre` du hero a changé.

L'événement `input` (`js/app.js:3092`) écrit la valeur, appelle `majVisibilite`, puis `plusTard`. Il ne calcule pas. De l'événement à la frame suivante : médiane 15 ms. Le rappel différé de 120 ms fait `sauver()` puis `tout()`, en synchrone sur le fil principal : médiane 60 ms (un seul rappel par essai). Le chiffre est engagé 195 ms après la frappe (délai + blocage + deux frames). L'animation du hero (450 ms) continue après ; elle n'est pas dans les 195 ms.

`calculer()` est appelé une fois par événement, et une fois pour une rafale de cinq `input` : le délai annule les rappels précédents. Les chemins qui appellent `tout()` tout de suite (changement de type de dette, d'activité, d'objectif) ne sont pas ce champ. L'événement `change` ne redouble un `input` que pour une case à cocher ou une liste (`js/app.js:3130`), pas pour ce nombre.

Sur cette frappe, Patrimoine étant caché : 6 `simulerDettes`, 7 `projeterValeurNette`, 0 Monte Carlo, puis le rendu des six pages. Les dettes et la projection sont bien synchrones, dans `calculer()`, à chaque frappe différée. Sur l'exemple elles sont le petit morceau (environ 6 ms inclusifs pour les six simulations, environ 8 ms pour tout `calculer()`). Le blocage de 60 ms est le redessin. Le Monte Carlo ne s'ajoute à la frappe que si la page Patrimoine est celle qui est ouverte.

## 3. Vérifié correct

- Le ralentissement est bien d'un facteur 4 : une boucle de 100 ms de temps mur fait 208 088 itérations au taux 4 et 838 759 au taux 1 (rapport 4,0).
- Démarrage : classe `pret`, aucun dialogue, assistant et écran d'ouverture sautés. Un seul `tout()` (l'exemple ne fait pas avancer le plan). Fin de réponse HTTP : médiane 3 ms.
- Un seul `calculer()` par `tout()`, un seul `tout()` par navigation. Rafale de cinq frappes : toujours un seul `tout()`.
- Hors de la page Patrimoine, `rendreChances` retourne tout de suite (`js/app.js:2271`) : `monteCarlo` reste à 0.
- Les graphiques réellement visibles sont à la largeur du conteneur (324 px), pas à 600 px. Le repli à 600 px ne concerne que les conteneurs masqués.
- Données n'a pas de résumé distinct : `#donnees` et `#donnees/detail` finissent tous deux sur `#donnees` en mode détail (`js/app.js:3212`). Les deux médianes (56 et 55 ms) décrivent le même rendu.
- « Voir tout le détail » du Budget et du Patrimoine ouvre le mode détail sur le sous-onglet retenu (au départ, Ce mois-ci et Aujourd'hui). Les médianes « détail » sont celles de `#budget/detail` → `#budget/mois` et de `#avenir/detail` → `#avenir/aujourdhui`.

## 4. Questions pour la personne

- L'exemple n'a qu'une marge et un horizon de 20 ans, et `calculer()` y est court. Faut-il refaire la même mesure avec plusieurs dettes (dont une hypothèque) et un horizon de 30 ans, là où `simulerDettes` pourrait peser davantage ?
- La probabilité de réussite doit-elle rester absente du résumé ? Aujourd'hui les 300 simulations partent dès que la page Patrimoine est ouverte, même quand la carte est masquée.
- Le délai de 120 ms avant recalcul est-il celui que vous voulez garder ? L'allonger ne réduit pas le blocage de la passe, il regroupe seulement les frappes, ce que cinq frappes rapides font déjà.
- Sur téléphone lent, quel plafond visez-vous pour une navigation : sous une longue tâche (50 ms), ou plus bas ?

## 5. Médianes et profil

Conditions communes : processeur ×4, 390 × 844, exemple du catalogue. Temps en millisecondes, de `performance.now()` dans la page. Démarrage : du début du document jusqu'à ce que `#v-apercu` contienne un `$` (observateur de mutations, complété par une frame si le texte est déjà là). Navigation : `location.hash = …`, puis deux `requestAnimationFrame`.

| Mesure | Médiane | Essais |
|---|---:|---|
| Démarrage, jusqu'au montant | 388 | 455, 457, 388, 374, 363 |
| Démarrage, horloge autour de `goto` | 400 | 471, 472, 400, 387, 373 |
| Aperçu, résumé (`#apercu`) | 74 | 111, 81, 74, 70, 70 |
| Aperçu, détail (`#apercu/detail`) | 77 | 77, 73, 82, 108, 63 |
| Revenu, résumé (`#revenu`) | 70 | 75, 63, 71, 70, 60 |
| Revenu, détail (`#revenu/detail`) | 98 | 104, 77, 91, 98, 100 |
| Impôt, résumé (`#impot`) | 71 | 87, 76, 71, 62, 59 |
| Impôt, détail (`#impot/detail`) | 74 | 77, 64, 74, 70, 75 |
| Budget, résumé (`#budget`) | 69 | 67, 56, 73, 69, 74 |
| Budget, détail (aboutit à `#budget/mois`) | 75 | 88, 75, 70, 75, 79 |
| Patrimoine, résumé (`#avenir`) | 112 | 139, 133, 112, 106, 103 |
| Patrimoine, détail (aboutit à `#avenir/aujourdhui`) | 98 | 105, 79, 83, 98, 104 |
| Données, `#donnees` | 56 | 64, 52, 51, 56, 61 |
| Données, `#donnees/detail` (même rendu) | 55 | 52, 55, 52, 61, 61 |
| Frappe, événement `input` → frame suivante | 15 | 20, 8, 15, 15, 16 |
| Frappe, rappel synchrone `sauver` + `tout` | 60 | 60, 61, 60, 63, 57 |
| Frappe, `input` → chiffre du hero engagé | 195 | 195, 190, 196, 195, 196 |

Mémoire, `JSHeapUsedSize` après ramasse-miettes : médiane des cinq démarrages 2 776 380 octets (2,8 Mo). Même page, avant la tournée 2 781 084 octets, après deux passages sur toutes les pages 4 057 752 octets (4,1 Mo).

Comptes d'appels (copie instrumentée, un essai chacun) :

| Passe | tout | calculer | simulerDettes | projeterValeurNette | monteCarlo | graphiqueLignes |
|---|---:|---:|---:|---:|---:|---:|
| Chargement | 1 | 1 | 6 | 7 | 0 | 7 |
| Vers Revenu, détail | 1 | 1 | 6 | 7 | 0 | 7 |
| Vers Patrimoine, détail | 1 | 1 | 6 | 307 | 1 | 8 |
| Vers Aperçu | 1 | 1 | 6 | 7 | 0 | 7 |
| Une frappe | 1 | 1 | 6 | 7 | 0 | 7 |
| Cinq frappes rapides | 1 | 1 | 6 | 7 | 0 | 7 |

Profil CPU d'une navigation `#revenu` → `#avenir/detail` (aboutit à `#avenir/aujourdhui`). Ce passage a duré 122 ms ; la fenêtre du profileur, un peu plus large que la navigation, dure 244 ms (121 échantillons). Self time agrégé par nom de fonction. Les fonctions fléchées sans nom sont distinguées par fichier et ligne, sinon elles se confondraient. `(program)` est le temps tombé dans le moteur, hors fonction JavaScript nommée : il couvre surtout l'écart entre les 122 ms mesurés et les 244 ms de fenêtre, et ne s'additionne pas à `ouvrir` (109 ms inclusifs, du même ordre que les 122 ms).

| Rang | Fonction | Self (ms) | Lieu |
|---:|---|---:|---|
| 1 | (program) | 126 | moteur |
| 2 | graphiqueLignes | 18 | `js/interface.js:153` |
| 3 | projeterValeurNette | 13 | `js/calc.js:836` |
| 4 | (garbage collector) | 7 | ramasse-miettes |
| 5 | quantile | 5 | `js/app.js:822` (dans le Monte Carlo) |
| 6 | nb | 5 | `js/interface.js:13` |
| 7 | rangee | 4 | `js/interface.js:75` |
| 8 | moisAn | 3 | `js/interface.js:18` |
| 9 | appendChild | 3 | DOM |
| 10 | anonyme, rangées de la trésorerie | 3 | `js/app.js:2370` |
| 11 | lexique | 3 | `js/interface.js:242` |
| 12 | R.monteCarlo | 3 | `js/app.js:818` |
| 13 | $ | 3 | `js/interface.js:11` |
| 14 | createElement | 3 | DOM |
| 15 | simulerDettes | 3 | `js/calc.js:712` |

Temps inclusif du même profil, pour les fonctions demandées. L'inclusif compte la fonction et ce qu'elle appelle ; les lignes se chevauchent ( `rendreChances` est dans `rendreAvenir`, qui est dans `tout` ).

| Fonction | Inclusif (ms) | Self (ms) |
|---|---:|---:|
| ouvrir | 109 | |
| tout | 107 | |
| rendreAvenir | 42 | |
| rendreChances | 30 | |
| graphiqueLignes | 21 | 18 |
| rendreApercu | 19 | |
| rendreBudget | 18 | 2 |
| R.monteCarlo | 17 | 3 |
| projeterValeurNette | 13 | 13 |
| calculer | 8 | |
| rendreRevenu | 6 | |
| simulerDettes | 6 | 3 |
| lexique | 6 | 3 |
| rendreImpot | 4 | |

Second profil, `#apercu` → `#revenu/detail` (ce passage : 107 ms ; médiane des cinq essais de cette navigation : 98 ms). `monteCarlo` absent. Inclusifs utiles à l'estimation : `tout` 95, `rendreApercu` 28, `graphiqueLignes` 26, `rendreBudget` 26, `rendreRevenu` 11, `rendreFlux` 11 (déjà dans `rendreBudget`), `rendreAvenir` 8, `calculer` 7, `simulerDettes` 5, `lexique` 6, `rendreImpot` 3.
