# Audit E — Accessibilité (WCAG 2.2 AA)

L'audit porte sur les six pages (résumé et détail, ou sous-onglet), en thème clair et en thème sombre, dans Chromium. axe-core 4.14.0 a été injecté depuis `/tmp` (la politique de contenu du site bloque un script en ligne ; le contournement est resté dans l'outil de test). Les règles lancées sont celles des étiquettes `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` et `wcag22aa`, avec `target-size` activée. Les règles de simple bonne pratique ne sont pas comptées.

Sur ces vues, axe ne relève aucune violation. Un état de plus, le bouton « Oui, tout remplacer » ouvert en thème sombre, échoue le contraste : 2,69:1.

Au clavier, « Restaurer une sauvegarde » est sauté. Dans les deux dialogues modaux, Tab et Maj+Tab posent le focus sur `body`, sans anneau, avant de revenir dans le dialogue. Échap ferme le panneau et rend le focus au bouton qui l'a ouvert.

En thème clair, les graduations des graphiques (`--axe`, 11 px) sont à 3,50:1 sur le blanc. En thème sombre, le crochet blanc sur le vert `#4cc283` est à 2,25:1, et le bouton destructeur plein est à 2,69:1. Le thème clair de ces deux boutons passe.

Le lien d'évitement, les segments, le lexique, le toast, le zoom et les textes atténués tiennent. Les cibles de 44 px visées par le dépôt ne sont pas toutes atteintes ; le critère 2.5.8 (24 px) ne produit pas de violation axe à 390 px.

## Constats

| ID | Gravité | Fichier et ligne | Constat | Preuve | Correction proposée | Effort |
|---|---|---|---|---|---|---|
| E-01 | élevée | `index.html:407-409` | « Restaurer une sauvegarde » n'est pas au clavier. Le contrôle est un `label` lié à un `input` fichier masqué. | Critère 2.1.1. Sur `#donnees`, focus sur `#exporter`, puis Tab : le focus passe à `#exporter-tableur`, puis à `#transfert-creer`. Le libellé n'est jamais l'élément actif. `label` : `tabIndex` −1, texte « Restaurer une sauvegarde ». `#importer` : `hidden`, `display: none`. | Un bouton qui ouvre le sélecteur de fichier, dans l'ordre de tabulation, avec le même libellé. | S |
| E-02 | élevée | `styles.css:101`, `styles.css:366` | En thème sombre, le texte blanc d'un bouton destructeur plein est sous le seuil de 4,5:1. | Critère 1.4.3. axe `color-contrast`, impact `serious`, cible `#confirmer-reinit` : contraste 2,69 (premier plan `#ffffff`, fond `#f27a6e`, 15,04 px, graisse normale), seuil 4,5:1. La même classe `bouton danger plein` est sur `#verrou-effacer-oui` (`index.html:47`) et sur « Remplacer mes données » (`js/app.js:3443`). En thème clair, blanc sur `#b42318` : 6,57:1, et axe ne signale rien. `--danger` sombre : `styles.css:71` et `styles.css:101`. | Assombrir le fond du bouton plein en thème sombre, ou y mettre un texte foncé, pour atteindre 4,5:1. | S |
| E-03 | moyenne | `styles.css:25`, `styles.css:440` | En thème clair, les graduations des graphiques sont sous 4,5:1. | Critère 1.4.3. `--axe` `#8b8981` sur le blanc `#ffffff` : 3,50:1. Texte mesuré « 0 $ », règle `.graphique .etiquette`, 11 px, graisse 400 (`js/interface.js:176`). Le même jeton sur le fond `#f5f4f0` : 3,18:1. En thème sombre, `#858379` sur `#1a1a19` : 4,58:1 (graduation « 0 $ » de `#vn-graph`). axe laisse ces nœuds `incomplete` : il ne détermine pas le fond d'un `text` SVG. Ce n'est pas une violation axe. | Descendre `--axe` en thème clair jusqu'à 4,5:1 sur le blanc et sur le fond de page. | S |
| E-04 | moyenne | `styles.css:97`, `styles.css:551` | En thème sombre, le crochet blanc sur le vert de confirmation est sous 3:1 et sous 4,5:1. | Critères 1.4.3 et 1.4.11. Clic sur `.conf` du panneau Revenu, après la transition : `aria-pressed="true"`, texte « ✓ », 12,48 px, 28×28, couleur `#ffffff`, fond `#4cc283`, ratio 2,25:1. La pastille d'aide `.puce-conf` (`index.html:441`, `styles.css:470`, 11,52 px, `aria-hidden="true"`) a les mêmes deux couleurs. En thème clair, le même clic donne blanc sur `#0b7a3e`, 5,43:1. `--bon` sombre : `styles.css:67` et `styles.css:97`. | Réserver le blanc à un vert assez foncé, ou écrire le crochet en encre foncée sur le vert clair. | S |
| E-05 | moyenne | `styles.css:703`, `js/app.js:3839` | À l'ouverture de l'assistant, le focus est sur le titre, sans anneau visible. | Critère 2.4.7. Dialogue `#assistant` ouvert sans la clé `wm.assistant`. Focus initial : `h2#as-titre`, « Bienvenue dans WealthMorand », `:focus-visible` vrai, contour `3px none`. La règle `.as-corps h2 { outline: none }` l'emporte sur `:focus-visible`. Le même `focus()` est rappelé à chaque étape (`js/app.js:3847`). Les boutons de l'assistant, eux, ont un contour `2px solid rgb(28, 92, 171)`. | Retirer `outline: none` du titre, ou ne l'appliquer qu'à `:focus:not(:focus-visible)`. | S |
| E-06 | moyenne | `styles.css:481`, `styles.css:693` | Tab et Maj+Tab sortent un instant d'un dialogue pourtant modal, et l'anneau disparaît. | Critères 2.4.3 et 2.4.7. `#assistant` et `#feuille` : `showModal()`, `matches(':modal')` vrai. Assistant, étape d'accueil : Tab depuis « Commencer » (`#as-suivant`) pose le focus sur `body` (`:focus-visible` faux, contour `none`) ; le Tab suivant entre sur « Fermer l'assistant ». Maj+Tab depuis `#as-fermer` pose aussi le focus sur `body`. Panneau Revenu : Tab depuis le dernier contrôle (« DMÉ ») et Maj+Tab depuis « Terminé » posent le focus sur `body`, dialogue encore `:modal`. Échap ferme et rend le focus : panneau Revenu vers « Modifier » ; assistant ouvert depuis « Partir de ma situation » vers ce bouton. Les deux ont alors un contour de 2 px. | Boucler Tab à l'intérieur du dialogue. Le `display: none` puis `display: flex` sur `.feuille` et `.assistant` est le premier endroit à revoir : la feuille de style du navigateur gère déjà l'affichage d'un dialogue. | S |
| E-07 | moyenne | `index.html:377`, `styles.css:408` | À 320 px de large, le tableau « De quoi elle est faite » défile à l'horizontale et rien dedans ne prend le focus. | Critère 2.1.1 (règle axe `scrollable-region-focusable`, non déclenchée à 390 px parce que le tableau n'y déborde pas). `#avenir/projection`, viewport 320×800 : `.tableau-defile` de `#vn-composition`, `overflow-x: auto`, `scrollWidth` 292, `clientWidth` 258, aucun lien, bouton ou champ à l'intérieur. Texte visible : « Aujourd'hui 2036 2046 Placements : REER, CELI… ». Le document lui-même ne déborde pas (`scrollWidth` = `clientWidth`, 320 et aussi 390). À 390 px, ce tableau ne déborde pas. | Rendre la zone focusable et la faire défiler avec les flèches, ou empiler les colonnes sous 390 px. | S |
| E-08 | faible | `styles.css:185`, `styles.css:547`, `styles.css:576` | Plusieurs cibles font moins de 44 px, objectif du dépôt. Elles restent au moins à 24 px, sauf les termes du lexique et un résumé de 22 px. | Critère 2.5.8 : axe `target-size` activée, aucune violation à 390×844 (la règle est dans les réussites sur `#revenu/detail` et `#donnees`). Mesures `getBoundingClientRect` à 390 px. Barre d'outils : hauteur 40 px (thème, Données, Installer ; `styles.css:856`). Segment Apparence : 105×35. Mots de passe du verrou `#vr-nouvelle` et `#vr-confirmer` : 270×38. Boutons d'action de Données : hauteur 43 px. `.conf` : 28×28. `.supprimer` : 32×32 (`js/app.js:339`). `#as-fermer` : 40×40. Résumé « Valeurs à confirmer » (`index.html:443`, `styles.css:459`) : 324×22. Termes du lexique, dans la phrase : hauteur 19 à 21 px (exception du texte en ligne). Lien « Détail » : boîte du texte 39×17, zone du `::after` (`styles.css:265`, `inset: -14px -10px`) 59×45. | Monter la hauteur minimale à 44 px pour les boutons, les segments et les champs. Laisser les termes du lexique dans le corps du texte. | M |
| E-09 | faible | `js/app.js:886-889` | Plusieurs liens s'appellent seulement « Détail ». Sur Budget, ils ne mènent pas au même endroit. | Critère 2.4.4, au minimum : le nom accessible est le texte du lien, sans `aria-label` ni `aria-labelledby`. Le `h2` est le frère précédent (`carteResume`). Revenu : deux « Détail » vers `#revenu/detail` (« D'où vient le revenu », « Travailler un peu plus »). Impôt : deux « Détail » vers `#impot/detail`. Budget : « Détail » vers `#budget/mois` (« Dépenses par catégorie ») et « Détail » vers `#budget/annee` (« L'année »). Patrimoine : « Détail » vers `#avenir/aujourdhui`. | Mettre le titre de la carte dans le nom accessible (« Détail des dépenses du mois », « Détail de l'année »). | S |
| E-10 | faible | `index.html:61`, `styles.css:195` | Sur un écran de 390 px, après le logo, le focus va à la barre du bas avant le contenu de la page. | Critère 2.4.3. Ordre mesuré sur `#apercu`, contour 2 px à chaque arrêt : « Aller au contenu » (y = 8), « WealthMorand : aperçu » (y = 10), puis Aperçu, Revenu, Impôt, Budget, Patrimoine (y = 779, hauteur 57), puis « Installer l'application », « Rapport PDF », « Passer au thème sombre », « Données et confidentialité », « Partir de ma situation ». La barre est `position: fixed` en bas (`styles.css:195`). Le lien d'évitement fonctionne (E, section vérifiée). | En vue téléphone, placer la navigation après le contenu dans l'ordre de tabulation, le lien d'évitement restant en tête. | M |
| E-11 | faible | `js/interface.js:172`, `js/interface.js:195` | Les graphiques en courbes n'ont ni `role="img"`, ni `<title>`, ni tableau de rechange. Le curseur n'a pas de valeur textuelle avant le focus. | Critère 1.1.1, partiel. Sur `#avenir/projection`, SVG `role="group"` `aria-label="Valeur nette projetée"`, et un second « Valeur nette : 8 cas sur 10 ». Pas d'élément `title`, pas de tableau voisin. Le `rect` est `role="slider"` ; `aria-valuetext` est `null` au chargement. Après focus et Flèche gauche sur `#vn-graph` : valeur « 2045 : Votre valeur nette 2 528 892 $ », contour 2 px, défilement de la page 0. Les barres, elles, ont `role="img"` et un `aria-label` (`js/app.js:907`). | Poser `aria-valuetext` dès le dessin, et un tableau (visible ou équivalent) pour la série. | M |

### E-01 — Restaurer une sauvegarde

Le bloc est dans la carte « Vos données restent ici ». « Exporter une sauvegarde » et « Exporter en tableur (CSV) » sont des boutons. « Restaurer une sauvegarde » est le libellé d'un fichier masqué. Un clic de souris ouvre le sélecteur, parce que le `label` pointe vers `#importer`. Au clavier, Tab ne s'arrête pas sur ce libellé : la preuve est la séquence ci-dessus, mesurée sur `#donnees` à 390 px.

### E-02 — Bouton destructeur en thème sombre

Le bouton n'est pas sur la vue par défaut : il paraît après « Revenir à l'exemple ». C'est le seul nœud en violation axe de tout l'audit. Le thème clair du même bouton est lisible. Les deux autres boutons de la même classe (« Oui, tout effacer » sur l'écran du verrou, « Remplacer mes données » après un lien de transfert) prennent les mêmes couleurs dès qu'ils s'affichent.

### E-06 — Focus et dialogues

Les deux dialogues sont de vrais dialogues modaux (`showModal`). Le fond n'a pas reçu un bouton actionnable pendant l'essai : l'arrêt intermédiaire est `body`, puis le focus revient dans le dialogue. L'anneau manque pendant cet arrêt. Échap, le retour du focus et le piège du panneau « Modifier » (vingt Tab sans sortie, avant le dernier contrôle) ont été vérifiés à part.

## Vérifié correct

Langue `fr-CA`. Le zoom du viewport n'est pas bloqué. Lien d'évitement : focus sur `a.saut`, contour 2 px, Entrée, focus sur `main#contenu` avec le même contour, ancre `#apercu`. « Voir tout le détail » : Entrée, ancre `#apercu/detail`, focus sur `main#contenu`, contour 2 px. La règle `main { outline: none }` (`styles.css:215`) ne gagne pas sur `:focus-visible`.

Panneau Revenu : ouverture au clavier, focus sur « Terminé », contour 2 px. Champ `#c-revenu-semaines` : contour `none`, et la bordure du parent `.saisie` passe de transparent à `rgb(18, 18, 17)`, 1 px (`styles.css:520` et `styles.css:529`). Échap rend le focus à « Modifier », contour 2 px. Dépense : « Autres dépenses », Entrée, « Ajouter une dépense », Entrée, focus dans le champ « Nom de la dépense », contour 2 px. Suppression : bouton « Supprimer : Nouvelle dépense ». Le toast a `role="status"` (`index.html:492`) ; « Annuler » est atteint par Tab, contour 2 px. Lien de transfert : le panneau « Passer à un autre appareil » s'ouvre, Échap rend le focus à « Créer un lien de transfert ».

Assistant : sans la clé `wm.assistant`, le dialogue s'ouvre. Flèche bas sur les boutons radio natifs choisit « mariés ». Sans choix, « Continuer » écrit « Choisissez votre situation familiale. » dans un `role="alert"`, le focus restant sur `#as-suivant`. Échap met `wm.assistant` à `1`. Segment « Horizon de la projection » : Flèche droite fait passer « 20 ans » à « 30 ans », `aria-checked` suit le focus (`js/interface.js:121-126`). Lexique : Entrée sur « onglet B » ouvre une bulle `role="status"` ; Échap la ferme et rend le focus au terme, contour 2 px.

Verrou : activation, focus sur `#verrou-phrase`. Mauvaise phrase : `#verrou-message`, `role="alert"`, « Phrase de passe incorrecte. » Le bouton de confirmation d'effacement reçoit le focus. Échap ne quitte pas cet écran. La bonne phrase rouvre l'application.

Thème : `localStorage` `wealthnord.theme`, attribut `data-theme` (`js/demarrage.js`). Bouton « Passer au thème sombre » : nom accessible présent. `prefers-reduced-motion: reduce` : animation du panneau `none` / `0s`, transition des boutons `0s`. Sans la préférence : animation `monter` 0,26 s.

Zoom : `#revenu/detail` à 640×800 (facteur 2) et à 320×800, `scrollWidth` du document égal à `clientWidth`. Textes atténués : pied de page `#67655e` sur `#f5f4f0`, 12,48 px, 5,30:1 ; en sombre, `#9c9a91` sur `#0e0e0d`, 6,85:1. Libellé de navigation « Aperçu », 12 px, graisse 500, même 5,30:1 en clair. Montant négatif en sombre (`#f27a6e` sur `#1a1a19`) : 6,46:1. Lien « Budget » en clair (`#1c5cab` sur blanc) : 6,63:1.

## Questions pour la personne

Le passage du focus par `body` dans un dialogue modal vient-il du `display: flex` posé sur le dialogue, et voulez-vous un bouclage explicite de Tab ?

Les liens « Détail » du revenu et de l'impôt vont au même endroit deux fois. Faut-il des ancres différentes, ou seulement un nom accessible qui reprend le titre de la carte ?

L'objectif de 44 px s'applique-t-il aux termes du lexique placés dans une phrase, et aux champs de 38 px de haut ?

## Annexe — violations axe par page et thème

Outil : axe-core 4.14.0, `runOnly` sur `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, règle `target-size` activée. Viewport 390×844. Thème par `localStorage['wealthnord.theme']` (`light` ou `dark`), qui pose `data-theme`. Avant le chargement : `localStorage['wm.assistant'] = '1'`, `sessionStorage['wm.ouverture'] = '1'`.

Aucune violation sur les vues suivantes, ni en clair ni en sombre (0 nœud chaque fois).

| Page | Route | Clair | Sombre |
|---|---|---|---|
| Aperçu, résumé | `#apercu` | 0 | 0 |
| Aperçu, détail | `#apercu/detail` | 0 | 0 |
| Revenu, résumé | `#revenu` | 0 | 0 |
| Revenu, détail | `#revenu/detail` | 0 | 0 |
| Impôt, résumé | `#impot` | 0 | 0 |
| Impôt, détail | `#impot/detail` | 0 | 0 |
| Budget, résumé | `#budget` | 0 | 0 |
| Budget, mois | `#budget/mois` | 0 | 0 |
| Budget, année | `#budget/annee` | 0 | 0 |
| Budget, dettes | `#budget/dettes` | 0 | 0 |
| Patrimoine, résumé | `#avenir` | 0 | 0 |
| Patrimoine, aujourd'hui | `#avenir/aujourdhui` | 0 | 0 |
| Patrimoine, projection | `#avenir/projection` | 0 | 0 |
| Patrimoine, placements | `#avenir/placements` | 0 | 0 |
| Patrimoine, proches | `#avenir/proches` | 0 | 0 |
| Données | `#donnees` | 0 | 0 |
| Panneau Modifier, revenu | `#feuille` sur `#revenu` | 0 | 0 |

État supplémentaire, hors de ces vues : Données, thème sombre, `#confirmer-reinit` visible. Une violation, règle `color-contrast`, un nœud (`#confirmer-reinit`, 2,69:1). Le même état en thème clair : 0 violation.

`color-contrast` reste `incomplete` sur chaque vue (souvent le `span` « Patrimoine » de la barre, ou un `text.etiquette` dont axe ne calcule pas le fond). Ces nœuds ne sont pas des violations. Les ratios mesurés à part sont dans E-03 et dans la section vérifiée. `target-size` est en réussite là où la liste des règles a été conservée (`#revenu/detail` clair, `#donnees` sombre) et n'apparaît dans aucune violation.

## Captures

Dans `captures/`, à 390 px sauf mention : `e-restaurer.png` (E-01, bloc de restauration) ; `e-danger-plein-light.png` et `e-danger-plein-dark.png` (E-02, bouton destructeur plein, les deux thèmes) ; `e-graphique-light.png` et `e-graphique-dark.png` (E-03, graduations d'un graphique) ; `e-conf-light.png`, `e-conf-dark.png`, `e-conf-presse-light.png` et `e-conf-presse-dark.png` (E-04, crochet de confirmation au repos et pressé) ; `e-assistant.png` (E-05, titre de l'assistant au focus) ; `e-cibles-390.png` (E-08, barre d'outils et segments) ; `e-focus-contenu.png`, `e-focus-saisie.png`, `e-focus-graphique.png`, `e-toast.png` et `e-lien-transfert.png` (section « Vérifié correct » : anneau de focus sur le contenu, un champ et le curseur du graphique, toast avec « Annuler », panneau du lien de transfert) ; `e-conf-clic-light.png` et `e-conf-clic-dark.png` (E-04, état juste après le clic) ; `e-assistant-tab.png` (E-06, Tab depuis « Commencer ») ; `e-verrou.png` (écran du verrou, section « Vérifié correct ») ; `e-zoom-640.png` et `e-zoom-320.png` (zoom à 200 % et largeur 320 px, section « Vérifié correct »).
