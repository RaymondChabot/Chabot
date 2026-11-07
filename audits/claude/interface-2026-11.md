# Méga-audit de l'interface — novembre 2026

## Résumé

L'application est techniquement saine : aucune erreur JavaScript, aucun débordement horizontal et aucun contraste
insuffisant sur 72 combinaisons (12 pages, deux profils, téléphone et ordinateur, thèmes clair et sombre) ; premier
affichage en 0,13 s, rendu complet en 0,12 s avec un processeur ralenti quatre fois. Les problèmes étaient de
hiérarchie : l'Aperçu mettait le budget en vedette plutôt que le revenu, la comparaison des modes était reléguée,
l'onglet Actes faisait 18,5 écrans de téléphone et l'en-tête du téléphone empilait quatre gros boutons sur chaque page.

## Méthode

- Parcours automatisé (Playwright, Chromium) : exemple de base (clinique, à l'acte) et profil GMF-U au mixte ;
  390 px et 1 280 px ; thèmes clair et sombre ; résumé, détail et sous-onglets de chaque page.
- Mesures par page : hauteur en écrans, cartes visibles, contenu au-dessus du pli, mots et montants affichés, cibles
  tactiles de moins de 44 px, contrastes (WCAG 2.2 AA), textes de moins de 12 px, débordements, erreurs.
- Performance : premier affichage, chargement et coût d'un rendu complet, processeur ralenti quatre fois.

## Constats et suites données

| Id | Gravité | Constat | Suite |
|---|---|---|---|
| I-01 | élevée | L'Aperçu ouvrait sur « Votre surplus mensuel » (budget) ; le revenu estimé n'arrivait qu'en 4e position, sous le pli ; la comparaison des modes n'y était pas. | Corrigé (v84) : revenu net de l'année en grand, brut, milieu et mode, écart avec le meilleur autre mode ; « Vos trois modes » juste dessous ; le budget dans les tuiles. |
| I-02 | élevée | Revenu, en GMF-U : la comparaison des modes venait après la carte de supervision. | Corrigé (v83) : les trois modes d'abord, avec une barre proportionnelle au net, la meilleure en or. |
| I-03 | élevée | Onglet Actes, en GMF-U : 18,5 écrans de téléphone (108 actes, 197 montants d'emblée). | Corrigé (v82) : « Les plus fréquents » (10 actes) au départ, puis « Voir les 108 actes » ; recherche sur tous les actes. 4,9 écrans. |
| I-04 | moyenne | Téléphone : quatre gros boutons empilés (Rapport PDF, thème, Données, Installer) en haut de chaque page. | Corrigé (v85) : une rangée d'icônes rondes de 44 px, nommées, à droite du titre. |
| I-05 | faible | 320 px : la légende de « Ce mois-ci » faisait chevaucher libellés et montants. | Corrigé (v86) : une colonne sous 360 px. |
| I-06 | faible | Finition : chiffres des tuiles en Inter, ombres et filets un peu marqués. | Corrigé (v86) : chiffres en Newsreader, ombres plus douces, filets plus fins, plus d'air entre les cartes. |
| I-07 | moyenne | Cibles tactiles de moins de 44 px : liens « Détail » et « Voir » (17 px de haut), bascules (35 px), champs (38 px), bouton Modifier (35 px). Conformes au minimum WCAG 2.2 de 24 px par l'espacement, mais pas à la règle de 44 px du projet. | Non retenu pour l'instant. |
| I-08 | faible | Aperçu : la carte « Votre portrait » et son gros bouton noir concurrencent l'essentiel ; « À faire » montre trois phrases longues. | Non retenu pour l'instant. |
| I-09 | faible | Étiquettes des axes des graphiques en 11 px. | À revoir avec la finition des graphiques. |

## Vérifié et trouvé correct

- Aucune erreur JavaScript, aucun débordement de 320 à 1 280 px, contrastes conformes dans les deux thèmes.
- Performance : premier affichage 0,13 s ; rendu complet 0,12 s (processeur ralenti quatre fois).
- Le rapport PDF n'est pas touché par ces changements (styles d'écran seulement).

## Mesures au téléphone (390 px), avant et après

| Page (profil GMF-U) | Avant | Après |
|---|---|---|
| Aperçu, au-dessus du pli | Comparaison demi-journée, Portrait, Ce mois-ci | Revenu net de l'année, Vos trois modes, Comparaison demi-journée |
| Revenu, au-dessus du pli | Supervision, Vos trois modes | Vos trois modes |
| Revenu, onglet Actes | 18,5 écrans | 4,9 écrans |
