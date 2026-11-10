# Méga-audit — 10 novembre 2026

Commit audité : `00ff7d6` (cache v95). Aucun fichier de l'app n'est modifié : ce rapport est le seul ajout.
L'audit a été arrêté à la demande de la personne avant la fin ; la section 7 dit ce qui n'a pas été fait.

## 1. Résumé

- Tous les montants de la RAMQ qui entrent dans le calcul du revenu sont exacts : 36 tarifs de visite, forfaits, suppléments, demi-per diem, taux horaire, mixte et 42 formulaires de la CNESST. Les paramètres d'impôt 2026, les cotisations et l'échelle des résidents le sont aussi.
- Cinq profils types recalculés à la main concordent au cent avec l'app, pour le revenu de la RAMQ comme pour l'impôt.
- Erreurs de montant : 16 tarifs d'actes techniques tronqués au dollar dans le répertoire (affichage, pas le revenu de l'année), 5 montants marqués « à confirmer » qui existent dans les documents fournis, et une prime d'assurance médicaments 2026 trop haute de 11,50 $.
- Défauts de modèle : l'année de transition perd la fin de la première année de pratique (−12 489 $ de brut sur le profil 4), la carte de supervision contredit le plan, une cotisation REER au-delà des droits est déduite en entier, et la valeur nette projetée suppose que tout le surplus est placé.
- Pour un médecin de GMF-U : l'assistant ne demande pas l'enseignement, le revenu affiché après la comparaison rapide ne compte aucune clientèle, et les horaires défavorables ne sont pas comptés.

## 2. Méthode et sources

- Tests de départ : ESLint sans erreur ; `tests/calculs.test.js` 254 vérifications ; `tests/navigateur.test.js` 354 vérifications.
- RAMQ : Manuel des médecins omnipraticiens, version imprimable du 28 octobre 2026 et version Web capturée le 25 octobre 2026 ; Brochure no 1, copie du 5 novembre 2026 (Entente générale, annexes XIV et XXIII, lettres d'entente) et capture Web du 25 octobre 2026 (ententes particulières 33, 40 et 42, protocoles d'accord).
- Impôt : Agence du revenu du Canada, page d'indexation (modifiée le 12 mars 2026) ; ministère des Finances du Québec, Paramètres du régime d'imposition des particuliers 2026 ; Revenu Québec (RRQ 2026) ; Québec.ca (RQAP, mise à jour du 19 mars 2026) ; bulletin d'information 2026-3 ; Normes d'hypothèses de projection 2026.
- Résidence : Entente FMRQ-MSSS 2021-2028, annexe I ; avis de la RAMQ du 16 juillet 2026 (hausse de 0,11 % au 31 mars 2026, confirmée par une recherche ; le tableau de l'avis n'a pas pu être lu).
- Parcours : Chromium (Playwright), 320 et 390 px, thèmes clair et sombre, stockage vide puis cinq profils fictifs ; 19 routes par profil.

## 3. Profils recalculés à la main

Tous en GMF-U en établissement, 3,5 h par demi-journée, 44 semaines, paramètres 2026. « Main » : recalcul indépendant à partir des montants officiels.

| Profil | Données | App | Main |
|---|---|---|---|
| 1. Première année, mixte | 6 demi-journées de clinique à 8 patients, 2 d'enseignement, 2 résidents, 300 patients du guichet, 25 % vulnérables | Mixte 178 641,84 $ ; horaire 157 298,36 $ ; acte 144 276,52 $ ; impôt et cotisations au mixte 66 032,53 $ | Identique au cent |
| 2. Établi, 1 000 inscrits | 6 demi-journées à 10 patients, 2 d'enseignement, 2 résidents, 30 % vulnérables | Mixte 222 461,86 $ ; horaire 187 599,58 $ ; acte 200 994,28 $ ; impôt au mixte 86 613,68 $ | 222 461,87 $ ; 86 613,69 $ |
| 3. Surtout enseignant | 6 demi-journées d'enseignement, 2 résidents et 1 externe, 300 inscrits | Mixte 200 214,01 $ (supervision 66 062,93 $ ; demi-per diem 35 046 $) | Identique au cent |
| 4. Transition | R2, pratique en juillet 2027, plan de novembre 2026 | Résidence : 74 305 $ brut, 52 666,10 $ net après scolarité ; période de transition : net 71 839,60 $ | 52 666,10 $ ; 71 839,61 $ |
| 5. Incorporé, en couple | Profil 2 en société (20,5 %), tout en dividendes ; partenaire à 60 000 $ | Net 119 377,79 $ ; partenaire 14 671,47 $ d'impôt et cotisations | 119 377,78 $ ; 14 671,47 $ |

Sur le profil 2, le brut, le net, l'impôt, le surplus, les dettes et la valeur nette sont identiques sur Aperçu, Revenu, Impôt, Comparer, Budget, Patrimoine et dans le rapport PDF. Les exceptions sont les constats M-06 et M-10.

Cas limites : tout à zéro, valeurs extrêmes, taux horaire au-delà de 1 540 heures avec 600 heures de garde (306 621,87 $, recalculé : 94 % sur 528 heures, 71,8 % ensuite). Aucun « NaN » affiché, aucune erreur, aucun débordement à 320 px.

## 4. Constats

Gravité : élevée (fausse une décision), moyenne (fausse un montant ou trompe dans un cas courant), faible. Effort : S, M ou L.

| Id | Gravité | Où | Constat | Preuve | Correction proposée | Effort |
|---|---|---|---|---|---|---|
| M-01 | moyenne | `js/repertoire.js` 5-6 et 78-102 | Les actes techniques sont tronqués au dollar : la version imprimable du manuel coupe les cents. 16 tarifs et 5 notes sont trop bas, jusqu'à 0,95 $ par acte. Trois montants sont marqués absents alors qu'ils existent. | Manuel Web du 25 octobre 2026 : 01240-01241 26,95 et 46,30 ; 01238-01239 41,45 et 63,70 ; 01236-01237 54,00 et 86,45 ; 01246-01247 54,00 et 68,05 ; 01244-01245 71,10 et 98,95 ; 01242-01243 92,55 et 135,75 ; 01184-01185 30,00 et 50,85 ; 01182-01183 46,15 et 70,75 ; 01180-01181 60,05 et 100,00 ; 01320 27,50 (10,45 $ par cm, maximum 236,50 $) ; 01323 17,75 (4,60 $ par cm, maximum 141,95 $) ; 01215 19,15 ; 01216 52,20 ; 01222 16,65 (4,05 $) ; 01223 29,40 (9,80 $) ; 01300 7,30 (2,05 $, maximum 19,60 $) ; 01196 26,25 ; 01005 17,00 ; 01164 18,55 ; 01165 15,35. | Reprendre ces montants ; corriger l'en-tête du fichier ; un test compare le groupe au manuel Web. | S |
| M-02 | faible | `js/repertoire.js` (09817, 15189 et 19074) ; `js/calc.js` 419-420 ; `tests/calculs.test.js` 486 ; README | Deux lignes disent « montant absent des documents : à confirmer ». Les montants sont dans la capture du 25 octobre de la Brochure. La note de la v94 était fausse. | Protocole d'accord sur le dépistage du cancer du sein : rapport AH-509 (09817) 29,65 $. EP 40, par. 7.03 : prise en charge temporaire d'une cliente enceinte (15189) 11,85 $ en cabinet et 8,95 $ en établissement depuis le 1er octobre 2019 ; 9,35 $ de plus (19074) pour un membre d'un GMF si la patiente est inscrite auprès d'un autre médecin du même GMF ; réservé au médecin qui a des privilèges en obstétrique. | Inscrire les montants ; ajuster le test qui fige « sans montant » ; compter le 15189 pendant la supervision seulement si la personne l'indique. | S |
| M-03 | faible | `js/calc.js` 44 | La prime d'assurance médicaments de 2026 est comptée à 789 $. La déclaration de 2026 couvre six mois à 766 $ et six mois à 789 $ : 777,50 $. | RAMQ, tarifs en vigueur (cités dans le code) : 766 $ jusqu'au 30 juin 2026, 789 $ ensuite. Écart : 11,50 $ par adulte. | Moyenne des deux périodes pour l'année civile ; textes « jusqu'à 789 $ » à ajuster. | S |
| M-04 | faible | `js/calc.js` 77-95 et 793 | Paramètres 2027 provisoires : le premier seuil du Fonds des services de santé n'est pas indexé (le second l'est) ; l'échelle des résidents de 2027 diffère de 1 $ (60 851 $ contre 60 850 $). Aucun montant officiel de 2027 n'est publié. | ARC : la page d'indexation s'arrête à 2026. Des projections de tiers donnent 2,6 % au fédéral (montant de base 16 879 $ ou 16 880 $), comme l'app. Le 3,15 % du Québec n'est confirmé par aucune source. | Remplacer dès la publication ; indexer les deux seuils. | S |
| M-05 | moyenne | `js/app.js` 734-741 | Parcours avec résidence : la période où la pratique commence compte une fraction de la première année, puis la suivante passe à l'année type. Le reste de la première année (suppléments d'inscription, prises en charge) est perdu. | Profil 4 : les douze premiers mois de pratique sont comptés 166 153 $ (4 mois à 178 642 $ par an, 8 mois à 159 909 $) au lieu de 178 642 $ : −12 489 $ de brut, environ −6 500 $ net. | Chaque période prend les mois de la première année qui lui reviennent, puis l'année type. | M |
| M-06 | moyenne | `js/app.js` 1385-1393 | La carte « Supervision : intervention ou visites ? », dite « selon votre plan », part toujours d'une prise en charge par demi-journée et de la part de patients vulnérables. Le calcul de l'année prend la répartition des visites. Les deux se contredisent. | Profil 2 : la carte annonce « les visites rapportent 11 $ de plus par demi-journée, environ 963 $ sur 88 demi-journées » ; l'onglet Modes dit « l'intervention rapporte plus » ; appliquer « visites » au plan baisse le brut de 285,95 $. | Départ de la carte calculé comme l'année (prises en charge, part de visites à des patients vulnérables, tarif moyen du plan). | S |
| M-07 | moyenne | `js/app.js` 541 et 1147 ; `js/calc.js` 701 | La cotisation REER inscrite est déduite en entier, même au-delà des droits REER inscrits. Aucune alerte, alors que le CELIAPP en a une. La projection répète la cotisation chaque année. | Profil 2 avec 60 000 $ de cotisation et 5 000 $ de droits : impôt de 57 404 $ au lieu de 86 614 $ (−29 209 $). | Borner la déduction aux droits quand ils sont inscrits ; alerte dans « À faire » ; droits des années suivantes à 18 % du revenu gagné, jusqu'au plafond annuel (à sourcer). | M |
| M-08 | moyenne | Patrimoine (résumé), Aperçu (tuile et « À venir ») | La valeur nette projetée suppose que tout le surplus est placé une fois les dettes payées. Ce n'est dit que dans l'onglet Projection. Après l'assistant, sans dépenses inscrites, l'Aperçu affiche « 2036 : 1 426 996 $ » et le jalon « Indépendance financière 2026 ». | Profil 2 : « 2036 : 1 332 725 $ », « 2046 : 4,13 M$ » avec 7 610 $ de surplus par mois. Parcours « 30 secondes » : valeurs ci-dessus avec 0 $ de dépenses. | Dire l'hypothèse sous le chiffre ; masquer la projection et l'indépendance tant qu'aucune dépense n'est inscrite ; au choix, une part du surplus placée. | S à M |
| M-09 | faible | Comparer, onglet Modes | Sous le tableau « Selon les patients par demi-journée », la note dit que le nombre de patients ne change pas le revenu au taux horaire. La colonne passe de 107 407 $ à 110 265 $ (forfaits de responsabilité). | Profil 2, texte de la page. | « Change peu : seuls les forfaits des examens s'ajoutent. » | S |
| M-10 | faible | App et rapport PDF | « À mettre de côté » : 7 284 $ par mois dans l'app (prime comprise), 7 218 $ dans le rapport PDF. Deux nets mensuels : 10 654 $ (Revenu, couverture du PDF) et 10 588 $ (Aperçu, Budget). L'écart est la prime de 789 $. | Profil 2. | Décision de la personne : le rapport PDF ne se touche pas sans son accord. | S |
| M-11 | élevée | Assistant et « Comparer mes modes en 30 secondes » | En GMF-U, aucune question sur l'enseignement. L'app suppose 2 demi-journées d'enseignement et 1 résident sans le dire ; le résumé annonce « 8 demi-journées de 8 patients ». L'accueil promet « trois questions », l'écran dit « question 1 sur 2 ». | Parcours depuis un stockage vide : `enseignement` 2, `residents` 1 après les deux parcours. | En GMF-U, une ligne « dont demi-journées d'enseignement » et « résidents en même temps » ; résumé conforme. | S |
| M-12 | moyenne | Comparaison rapide | Le revenu affiché ne compte aucune clientèle (0 inscrit) et « Membre d'un GMF » est décoché, alors que le portrait complet le coche en GMF-U. Rien ne le dit sous le chiffre. | Après le parcours : brut de 156 746 $ au taux horaire, forfaits et suppléments à 0 $. | Une question « patients inscrits, environ » ; GMF coché en GMF-U ; mention « sans votre clientèle » tant qu'elle est vide. | S |
| M-13 | moyenne | `js/calc.js` (`revenuGmfu`) | Les majorations en horaires défavorables ne sont pas comptées. Au mixte en GMF-U, elles s'appliquent à la part des actes. | Annexe XXIII, section B-2, point 5 : 25,17 % de 18 h à 22 h du lundi au jeudi ; 40,89 % le vendredi soir, le samedi, le dimanche et les jours fériés. | Des demi-journées « de soir ou de fin de semaine » ; règles de l'acte et du taux horaire à sourcer avant de coder. | M |
| M-14 | faible | `js/app.js` 1534-1538 ; `js/repertoire.js` | La recherche du répertoire reste dans le groupe choisi et répond « Aucun acte ne correspond » pour un code d'un autre groupe. Vingt codes des listes du mixte en GMF-U manquent (15230, 08841, 08843, 15787, 15788, 15882 à 15888, 15895, 15896, 09077, 15318, 15320, 42273, lettre d'entente no 223). | Recherche de 19914 dans « Formulaires et suppléments » ; listes de la section B-2. | Chercher partout dès qu'un code est tapé ; ajouter les codes au besoin. | S |
| M-15 | faible | Panneau Revenu ; Aperçu | En GMF-U, l'essentiel compte 22 champs, dont trois sur les catégories de vulnérabilité et les frais de cabinet, sans objet en établissement. Une pastille ✓ suit chaque champ. Le surplus est affiché deux fois sur l'Aperçu. | Captures à 390 px. | Déplacer ces champs dans le détail ; pastilles discrètes ; un seul surplus. | S |
| M-16 | moyenne | `js/app.js` 4220-4232 et 34-44 | Restauration d'une sauvegarde : seuls cinq champs sont bornés. Un texte dans un champ numérique est accepté et tous les montants deviennent incalculables après « Sauvegarde restaurée ». Les valeurs négatives ou géantes passent ; les clés inconnues sont gardées. | Fichiers fictifs : un champ en texte donne un brut non numérique ; −5 patients et 150 % de vulnérables sont gardés ; 10^12 patients acceptés. Les fichiers qui ne sont pas des sauvegardes sont refusés avec un message clair, et un nom contenant du HTML reste du texte. | Valider chaque champ avec le type et les bornes du panneau ; refuser si le calcul n'est pas fini ; ignorer les clés inconnues. | M |
| M-17 | moyenne | Panneaux « Modifier » | Les champs numériques ont un minimum de 0 et aucun maximum : 80 semaines par année ou 999 999 patients par demi-journée sont acceptés (revenu de plusieurs milliards). Une valeur négative donne 0 dans le calcul, mais le champ garde −5. Dans le navigateur d'essai, « 7,5 » devient 75. | Saisie réelle dans le panneau Revenu. | Maximums plausibles (52 semaines, 100 %, 40 patients, 12 heures) ; champ remis à la valeur gardée ; virgule décimale à vérifier sur iPhone et Android. | S |

## 5. Vérifié et trouvé correct

- **Visites** : les 36 tarifs des deux colonnes (manuel imprimable et manuel Web).
- **Répertoire** : 69 autres codes ; la part payée au mixte de chaque code (63,58 %, 62,15 % ou 100 %) correspond aux listes de la section B-2 et à l'annexe II de l'annexe XXIII.
- **CNESST et IVAC** : les 42 tarifs en vigueur depuis le 1er avril 2025.
- **Annexe XIV** : 99,48 $ ; 1 540 heures ; 94 % sur 528 heures de garde ; 71,8 % ; 880 heures autorisées ; année du 1er juin au 31 mai.
- **Annexe XXIII, section B-2** : 59,68 $ et 14,92 $ ; 63,58 % ; 62,15 % ; 24,87 $ par 15 minutes ; plafonds de 3,5 heures, 5 heures et 3,5 heures ; suppléments de l'annexe II avec l'intervention ; visites avant ou après le bloc seulement.
- **EP 40** : par. 4.01, 4.12 A à C, 13.01, 6.01 (groupes I à IV), 6.02, 7.02, 8.01, 4.15, 15.01, 15.03 et 15.05, 16.02 à 16.04, 14.01, 17.01.
- **EP 42** : demi-per diem des listes 1 et 2. **EP 33**, annexe V : 9,35 $, une fois par année civile et par GMF.
- **Impôt 2026** : tranches et montants fédéraux et du Québec, RRQ, RQAP, assurance-emploi, Fonds des services de santé, frais de garde, allocations, dividendes (3,42 % puis 2,69 %).
- **Résidence** : échelle de 2026 (entente × 1,0011), primes de 725 $ et de 286 $, scolarité de 900 $, 1 100 $ et 1 300 $.
- **Textes** : aucun montant de la RAMQ écrit dans les panneaux, le lexique ou les pages ne diffère des constantes du moteur.
- **Rapport PDF** : mêmes chiffres que l'app sur le profil 2, sauf M-10. Il n'a pas été modifié.
- **Premier lancement** : accueil et assistant courts et clairs ; validation de chaque étape ; aucun débordement à 320 px.

## 6. Constats des audits précédents

- Corrigés et revus : crédit pour personne à charge admissible, crédit syndical du Québec à 10 %, prime de 789 $, assurance-emploi 2027, Fonds des services de santé sur les dividendes, société l'année de transition, plafond du REEE à 50 000 $.
- Sans effet pour ce public : le montant pour personne vivant seule (réduit à zéro au revenu d'un résident ou d'un médecin).
- Encore ouverts : facteurs d'indexation de 2027 (M-04) ; `remboursementReer` exporté et faux pour un salarié ; étiquettes d'axes de 11 px ; `js/app.js` de 4 907 lignes ; validation de l'import, bornée sur cinq champs seulement (M-16).
- Non revérifiés cette fois : lot 4 (messages de la première année, échéances) et lot 6 (dettes et REEE).

## 7. Non fait ou non vérifié

- Arrêt avant la fin : accessibilité avec un outil, performance mesurée, hors ligne et mises à jour, politique de sécurité du contenu, verrou, couverture détaillée des tests. Les 354 vérifications existantes passent.
- Paramètres fiscaux de 2027 : non publiés. Documents attendus : page d'indexation de l'ARC et Paramètres du régime d'imposition des particuliers 2027.
- Ententes particulières 33, 40 et 42 : vérifiées sur la capture du 25 octobre 2026 ; la copie du 5 novembre ne les contient pas. Document à fournir : la section « Ententes particulières » de la Brochure no 1.
- Avis de la RAMQ du 16 juillet 2026 sur les résidents : la page n'a pas pu être lue. Document à fournir : l'avis, avec son tableau.
- Codes 19911 à 19921 : la correspondance entre chaque code, le lieu et la liste n'est dans aucun document. Document à fournir : l'avis de facturation de l'EP 42.
- Horaires défavorables à l'acte et au taux horaire : sources à fournir avant la proposition 8.
- Mode composé (Loi 2) : une recherche du 10 novembre 2026 n'a trouvé aucune publication de ses montants ; résultat non concluant. Il n'est pas ajouté.
- Forfait de responsabilité au taux horaire pour les examens faits par les résidents : l'app ne le compte pas ; la règle (EP 40, par. 6.02 B) ne tranche pas.
- Virgule décimale : à essayer sur un iPhone et un Android réels.

## 8. Propositions, par utilité pour un médecin de GMF-U

| No | Proposition | Bénéfice | Effort | Risque |
|---|---|---|---|---|
| 1 | Corriger les montants : actes techniques, cinq « à confirmer », prime de 777,50 $ (M-01, M-02, M-03) | Un répertoire exact au cent | S | Faible |
| 2 | Demander l'enseignement et la clientèle dès le départ en GMF-U (M-11, M-12) | Un premier chiffre juste pour un collègue | S | Faible |
| 3 | Rendre la carte de supervision cohérente avec le plan (M-06) | Fin d'un conseil contradictoire | S | Faible |
| 4 | Compter la première année en entier après la résidence (M-05) | Environ 12 500 $ de brut retrouvés dans le plan d'un résident | M | Moyen : projections à retester |
| 5 | Borner le REER aux droits et avertir (M-07) | Évite une économie d'impôt qui n'existe pas | M | Faible |
| 6 | Dire l'hypothèse de la projection et la masquer sans dépenses (M-08) | Des chiffres crédibles devant des collègues | S à M | Faible |
| 7 | Bornes de saisie et validation complète de l'import (M-16, M-17) | Plus de montant absurde ni de sauvegarde qui casse l'app | M | Faible |
| 8 | Demi-journées de soir et de fin de semaine (M-13) | Compare vraiment les modes pour qui fait du soir | M | Moyen : sources à compléter |
| 9 | Alléger : champs de détail, pastilles, surplus en double, recherche du répertoire (M-14, M-15) | Moins à lire sur téléphone | S | Faible |
| 10 | Afficher la date de vérification de chaque source et passer à 2027 dès la publication (M-04) | Confiance ; rien de périmé en janvier | S | Faible |

## 9. Questions pour la personne

1. M-10 : garder les deux montants (avec et sans la prime), ou aligner l'app et le rapport PDF ?
2. M-02 : compter la prise en charge temporaire d'une cliente enceinte (15189) seulement pour qui a des privilèges en obstétrique ?
3. M-08 : la projection doit-elle placer tout le surplus, ou une part que vous choisissez ?
4. Quels lots faire en premier ?
