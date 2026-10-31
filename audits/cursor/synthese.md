# Synthèse de l'audit complet

Rédigée le 31 octobre 2026 à partir des onze rapports de `audits/cursor/` (A à K), sur le commit `1fd682a` de `main`. Aucun fichier de code n'est modifié. Chaque constat critique ou élevé a été relu dans le code avant d'entrer ici ; les lignes citées sont celles du commit audité.

## 1. Résumé

Le moteur de calcul est juste là où il a été vérifié contre une source : les 18 tarifs de visite, l'échelle de la FMRQ, les barèmes d'impôt 2026, le RRQ, le RQAP, l'assurance-emploi, les formules fermées d'hypothèque et de REER collent au cent ou au dollar près (A, B, C). Les défauts les plus coûteux sont dans ce qui s'est ajouté autour du moteur : le plan qui avance chaque mois (commit `1fd682a`) reverse la cotisation CELIAPP de l'année à chaque ouverture, oublie le renouvellement d'une hypothèque échue et redonne le privilège de remboursement anticipé ; l'assistant de départ garde la clientèle et les frais de l'exemple fictif en les présentant comme ceux de la personne ; l'année de transition résidence–pratique incorporée additionne deux déclarations. Trois règles fiscales manquent (personne à charge admissible, personne vivant seule, crédit syndical du Québec), deux règles de la RAMQ paient trop peu (garde au-delà de 1 540 h, transfert en bloc), et le CELIAPP n'a pas de plafond annuel. L'interface, l'accessibilité (0 violation axe sur les vues courantes), la sécurité (CSP stricte, chiffrement correct) et la performance sont saines ; leurs constats sont des libellés, des contrastes en thème sombre, un import non validé et un rendu qui redessine six pages à chaque geste. Les tests passent (ESLint 0, 202 et 235 vérifications) mais ne voient aucun des constats critiques : ils comparent souvent le code à lui-même.

## 2. Doublons fusionnés

| Constat retenu | Doublons | Sujet |
|---|---|---|
| C-01 | K-01 | Cotisation CELIAPP reversée en entier à chaque avance du plan |
| C-02 | G-01, H-01 | Aucun plafond annuel de 8 000 $ au CELIAPP (impôt et projection) |
| C-04 | K-02 | Renouvellement déjà simulé oublié quand le plan avance |
| C-05 | K-03 | Privilège redonné au mois 0 de chaque simulation ; réserve non reprise |
| C-11 | K-04 | Objectif dédié échu pendant les mois sautés non relevé |
| C-12 | K-09 | Maison, autos, autres actifs et encaisse non avancés ; âge des autos remis à zéro |
| C-24 | K-12 | « Annuler » remet tout l'état, y compris une modification faite pendant l'avis |
| C-18 | G-04, K-11, H-02 | Commentaire du renouvellement périmé ; le code recalcule le paiement (juste) ; le test ne le vérifie pas |
| A-07 | G-05, K-10, H-03 | `P2027` indexe les déductions médicaments malgré le commentaire |
| A-08 | K-10 (second point) | `fss.seuil1` seul non indexé en 2027 |
| A-13 | G-08 | `remboursementReer` exporté, jamais lu, et faux hors travail autonome |
| A-09 | J-08 (en partie), A question 7 | Prestations sur le revenu de l'année courante ; crédit pour la solidarité absent |
| E-03 | D-11 | Graduations des graphiques à 3,50:1 en thème clair |
| E-08 | D-15 | Cibles sous 44 px |
| I-01 | G-06, I-02 | `tout()` recalcule et redessine les six pages à chaque geste ; graphiques dessinés à 600 px hors écran |
| J-01 | J-07 | L'assistant garde les champs de l'exemple (clientèle, frais, 46 semaines) |
| D-03 | K-06, K-07 | Acompte du 15 mars annoncé en même temps qu'« aucun acompte » ; messages de première année périmés |
| K-13 | H-04, H-09 | Tests du plan qui avance et des parcours manquants |

## 3. Revérification des constats critiques et élevés

Chaque ligne a été relue dans le code du commit `1fd682a` le 31 octobre 2026.

| Constat | Gravité | Vérifié dans le code | Verdict |
|---|---|---|---|
| C-01 / K-01 | critique | `js/calc.js` 875-876 : `k % 12 === 0` verse `min(cotisationAnnuelle, 40000 − cumul)` au mois 0 ; `js/app.js` 3262-3268 écrit `p.celiapp` et `p.cumulCeliapp` dans l'état. Chaque avance reverse donc l'année. | Confirmé |
| J-01 | critique | `js/app.js` 3858-3874 : `portraitDepuis` clone `EXEMPLE`, puis `Object.assign(s.revenu, …)` ne remplace ni `patientsParDJ`, ni `nouveauxGuichet`, ni `partVulnerable`, ni `fraisCabinetPct` ; `meta.exemple` passe à faux (3861). | Confirmé |
| C-02 / G-01 | élevée | `js/app.js` 513 et `js/calc.js` 875 : seul 40 000 $ borne la cotisation. README, aide du champ et conseil « prochain 1 000 $ » promettent 8 000 $. | Confirmé |
| C-04 / K-02 | élevée | `js/app.js` 3259-3260 : seul `d.solde` est repris ; `js/calc.js` 748-751 a pourtant simulé le nouveau taux et le nouveau paiement. | Confirmé |
| C-05 / K-03 | élevée | `js/calc.js` 739-741 : `if (date.getMonth() === 0 \|\| m === 0)` remet le privilège ; `reserve` n'est lue par aucune ligne d'`avancerPlan`. | Confirmé |
| C-03 | élevée | `js/app.js` 480 : `R.interetsEtudes = Σ solde × taux / 100`, réutilisé aux lignes 514, 552 et 699 pour toutes les années ; `sim.parAn.interetsEtudes` n'est lu nulle part. | Confirmé |
| A-11 | élevée | `js/app.js` 698-703 : `brutRes ? sommeImpots(perso(), soc) : soc` additionne deux déclarations complètes. | Confirmé |
| A-01, A-03 | élevée, moyenne | `js/calc.js` 440-447 : `impotsDeBase` n'accorde que `bpaMax`/`bpaMin` et `montantBase` plus les crédits passés ; aucune occurrence de « charge admissible » ni « vivant seule » dans `js/`. | Confirmés |
| B-01 | élevée | `js/calc.js` 351-358 : l'excédent est partagé au prorata `garde / heuresHoraire` ; le commentaire le dit. La lecture des par. 5.02-5.05 par le rapport B (garde d'abord) est une interprétation à faire confirmer : question 1 de la section 6. | Confirmé dans le code ; interprétation à trancher |
| B-02 | élevée | `js/calc.js` 287-293 et 324-332 : `nouveauxTransferes` entre dans `inscrits` et dans `forfaitInscription` en entier, et dans aucun supplément. | Confirmé ; la règle dépend du cas (lettre 304 ou non) |
| D-01 | élevée | `js/app.js` 577 (`R.netVue = impot.net − dproPerso`) et 623 (`R.travailMoi = (… − R.primeMoi) / 12`) : deux nets, 9 116 $ et 9 052 $. | Confirmé |
| D-02, D-03, D-04 | élevée | Libellés et ordre du DOM ; D-03 recoupe K-06 (liste tronquée à cinq) et K-07 (messages de première année). | Confirmés par les captures et K |
| E-01 | élevée | `index.html` 407 : `label for="importer"` sans bouton ; un `label` n'est pas focusable. | Confirmé |
| E-02 | élevée | `styles.css` 101 (`--danger: #f27a6e` en sombre) et 366 (`.bouton.danger.plein { color: #fff }`) : 2,69:1. | Confirmé |
| F-03 | élevée | `js/app.js` 24-29 : `fusion` recopie les clés inconnues ; 3326-3328 : `restaurer` teste trois conditions, écrit (`sauver()`) avant `tout()` ; `js/calc.js` 818 boucle sur `17 − âge` sans borne. | Confirmé |
| H-02 | élevée | `tests/calculs.test.js` 62-64 : seul `r.taux === 4.5` et l'année sont vérifiés. | Confirmé |
| I-01 | élevée | `js/app.js` 2041-2046 : `tout()` appelle les six `rendre*` ; 3225 : `ouvrir()` appelle `tout()`. | Confirmé |
| J-02, J-03, J-04, J-06 | élevée | Fonctions absentes ou simplifiées, décrites avec leurs lignes dans J. | Confirmés comme manques ; ce sont des choix de produit, voir section 6 |
| F-11 | élevée | Conception des comptes (README, `supabase/schema.sql`). Rien n'est encore codé côté client. | Pas une erreur du code livré : décision avant de coder |
| J-05 | élevée | `js/app.js` 2543-2551 : règle du multiple sans RRQ ni pension de vieillesse ; la tuile dit « 25 fois vos dépenses ». | Confirmé ; choix de modèle à trancher |

Aucun constat critique ou élevé n'est écarté comme faux. Deux (F-11, J-05) ne décrivent pas une erreur du code mais une décision de conception : ils sont dans la section 6 plutôt que dans un lot.

## 4. Classement par gravité et par valeur

Valeur : ce que la personne perd ou croit à tort, dans un cas courant, en dollars ou en confiance.

1. **C-01 / K-01** (critique). Plan qui avance : 8 000 $ prévus deviennent 40 000 $ de CELIAPP en cinq ouvertures ; la déduction de l'année tombe à zéro. Touche toute personne avec un CELIAPP dès le deuxième mois d'usage.
2. **J-01** (critique). Après l'assistant, la pratique affichée comme la sienne a 6 patients par demi-journée, 500 nouveaux du guichet, 30 % de frais et 46 semaines de l'exemple, sans avertissement. Le premier chiffre vu est faux et n'est pas marqué comme tel.
3. **C-02 / G-01** (élevée). 20 000 $ inscrits au CELIAPP sont déduits et projetés en entier ; 3 803 $ d'impôt de moins affichés pour l'année.
4. **C-04 / K-02** (élevée). Terme échu pendant l'absence : 16 810 $ d'intérêts oubliés sur 59 mois, paiement sous-estimé de 195 $ par mois.
5. **C-05 / K-03** (élevée). Privilège redonné chaque mois : 32 232 $ remboursés au-delà du plafond ; réserve de 32 139 $ qui disparaît du patrimoine.
6. **A-11** (élevée). Année de transition avec société : impôt sous-estimé d'environ 5 080 $ (fédéral) et 6 261 $ (Québec) sur l'exemple.
7. **C-03** (élevée). Intérêts d'études figés au solde d'aujourd'hui : 9 507 $ d'économie sur 20 ans au lieu de 2 593 $.
8. **A-01** (élevée). Parent seul : 1 923 $ de crédit fédéral absent chaque année.
9. **B-01** (élevée). Garde au-delà de 1 540 h : 3 451 $ à 6 802 $ par année selon le cas, si l'interprétation du rapport B est confirmée.
10. **B-02** (élevée). Transfert en bloc : jusqu'à 15 535 $ de suppléments non comptés pour 100 patients vulnérables.
11. **F-03** (élevée). Sauvegarde importée sans schéma : une valeur hors borne gèle l'application, et l'état est déjà écrit.
12. **D-01, D-02, D-03** (élevée). Deux « nets », deux « dettes », « aucun acompte » à côté d'un acompte du 15 mars : la personne ne peut pas recouper les pages.
13. **E-01, E-02** (élevée). Restaurer une sauvegarde inaccessible au clavier ; bouton destructeur illisible en thème sombre.
14. **I-01** (élevée). Chaque geste redessine six pages : 55 à 112 ms au téléphone lent, 388 ms au démarrage.
15. **A-02, A-03, A-04, A-05** (moyenne). Crédit syndical du Québec (90 $ sur 1 000 $), personne vivant seule (304 $), plafond de prime 789 $ depuis juillet 2026, assurance-emploi 2027 à 1,29 %.
16. **C-06 à C-12** (moyenne). REEE : âge qui monte sans croissance du solde, pas de report de droits, pas de plafond de 50 000 $, subventions déjà reçues non suivies ; fin de terme déjà passée ; objectifs échus ; maison et autos non avancées.
17. **B-03 à B-06** (moyenne). Compensation par demi-journée au lieu de par jour civil, pondération du forfait de volume, assiduité à trois paliers, patients pendant la supervision.
18. **D-04 à D-10, D-17 ; E-04 à E-07 ; K-05 à K-08** (moyenne). Bandeau d'exemple sous le chiffre, hero Impôt qui ne se recompose pas, panneau Revenu de 16 puis 62 champs, dialogues qui laissent passer le focus par `body`, solde de première année calculé sur douze mois de pratique, titre « Impôt 2027 » pour un plan de 2028.
19. **F-01, F-02, F-04, F-06 ; I-03 ; C-13 à C-15 ; G-02, G-03, G-06** (moyenne). CSP en `meta` seulement, deux chaînes HTML non échappées, restauration sans confirmation, décompression sans plafond ; 300 simulations synchrones ; extra négatif ramené à 0, 0,5 point des normes, drapeau « première » hors de son année ; fonctions de 390 lignes, duplication écran/PDF.
20. Tous les constats faibles (A-06 à A-10, A-13, B-07 à B-10, C-16 à C-24, D-12 à D-16, E-08 à E-11, F-05, F-07 à F-10, G-07, G-08, H-08, I-04, K-09 à K-12, K-14).

## 5. Lots de corrections

Contrainte : `js/app.js` (3 935 lignes) et `js/calc.js` (950 lignes) portent à eux deux la plupart des constats. Les lots ci-dessous sont faits pour être menés en parallèle : deux lots ne touchent jamais la même **fonction**, et les paires qui partagent un fichier sont nommées. Les fichiers de test reçoivent des blocs ajoutés en fin de fichier (`tests/calculs.test.js`) ou de nouvelles fonctions ajoutées au tableau des scénarios (`tests/navigateur.test.js` l. 972) : les fusions y sont additives. Effort : S (une séance), M (une journée de travail concentré avec ses tests), L (plusieurs étapes, chacune verte).

| Lot | Constats | Fichiers et fonctions | Tests à ajouter | Effort |
|---|---|---|---|---|
| **1. Plan qui avance et CELIAPP** | C-01/K-01, C-02/G-01/H-01, C-04/K-02, C-05/K-03, C-06, C-11/K-04, C-12/K-09, C-15, C-21, C-24/K-12, K-13, K-14 | `js/app.js` : `avancerPlan`, `avancerSiNouveauMois`, l'avis et « Annuler » (3253-3310), `R.celiappAnnee` (510-513) ; `js/calc.js` : `projeterValeurNette` (843-891, CELIAPP au prorata ou en janvier, relevé après le remplacement des autos), remise du privilège dans `simulerDettes` (739-741) ; `js/catalogues.js` : champ `anneePremiere` (K-14) | H-01 (annexe H, test 1 et `celiappAnnuel`), H-04 (`planMoisSautes`), invariance « deux avances d'un mois = une avance de deux mois » sur dettes, placements, objectifs, valeur nette (K-13) ; terme échu pendant le saut (K-02) ; privilège sur douze mois (K-03) | L |
| **2. Impôt : règles manquantes et paramètres** | A-01, A-02, A-03, A-04, A-05, A-07/G-05/K-10/H-03, A-08, A-12, A-13/G-08 | `js/calc.js` : `P2026`/`P2027` (40-99), `impotsDeBase`, `impotParticulier`, `impotSalarie`, `impotMixte`, `transfertsConjoints`, `impotDividendes`, `comparerSociete`, `remboursementReer`, `tauxMarginal` (440-680) ; `js/catalogues.js` : aide du champ syndicat (509), nouveau champ « je vis seule » ; `js/rapport.js` 481 (« crédit » au lieu de « déduction ») | Annexe A (douze cas statutaires, A-01, A-02, A-03, A-05, A-12) ; H-03 (test 3), H-07 (test 7), H-08 (test 8) | M |
| **3. RAMQ** | B-01, B-03, B-05, B-06, B-07, B-08, B-09, B-10, et B-02 / B-04 une fois tranchés | `js/calc.js` : `revenuGmfu` (263-415), `compensationCabinet` (254-258), `montantsVolume` (231-235), `tauxPolyvalence` (242) ; `js/catalogues.js` : aides des champs (30-33, 339-417) | Cas A, B et C de B-01 ; compensation à 64,80 $ par jour civil (B-03) ; assiduité 70/75/80 % (B-05) ; supervision sans patients pendant le bloc (B-06) | M |
| **4. Année de transition et messages d'impôt** | A-11, C-03, K-05, K-06, K-07, K-08, D-03, D-05, D-06, D-17 | `js/app.js` : `calculer`, partie `anneeParcours`/`impotMoi` (678-760) et `interetsEtudes` (480, 514, 552), `echeances` (1071-1095), `resumeImpot`/`rendreImpot` (1500-1600), « À faire » (1020-1030), trésorerie (2345-2360) ; `js/rapport.js` : sommaire pour le comptable (528-622) | Une seule déclaration l'année de transition (A-11, chiffres de l'annexe A) ; intérêts d'études de `parAn` (C-03) ; acompte visible quand cinq échéances précèdent (K-06) ; `HORLOGE=2029-02-10` sans « 30 avril 2028 » (K-07, K-08) | M |
| **5. Assistant et exemple** | J-01, J-07, J-02, D-09, D-16 | `js/app.js` : `portraitDepuis`, `terminerAssistant`, étapes de l'assistant (3680-3916) ; `js/catalogues.js` : libellés genrés (445) | Scénario assistant depuis un stockage vide (H-09, partie assistant) : la pratique n'hérite d'aucun champ de clientèle de l'exemple, 38 semaines si vacances et hôpital, prêt d'études saisi avec son taux | M |
| **6. Dettes et REEE dans le moteur** | C-07, C-08, C-09, C-10, C-13, C-16, C-17, C-18/G-04/K-11, C-19, C-20, C-22 | `js/calc.js` : `projeterReee` (810-830), `simulerDettes` hors des lignes 739-741 (renouvellement 745-752, taux de période 718, extra 735), `tauxReel` (689), commentaire 687 ; `js/catalogues.js` : champs « subventions déjà reçues », « cotisations déjà versées », aide du crédit (34 %) | H-02 (test 2), H-06 (test 6) ; REEE : plafond 50 000 $, report de droits, année des 17 ans ; fin de terme passée renouvelée au mois 0 | M |
| **7. Interface : libellés et mise en page** | D-01, D-02, D-04, D-07, D-08, D-10, D-12, D-13, D-14, E-09, E-10 | `js/app.js` : `rendreApercu` (951-1065), `rendreRevenu`/`rendreResidence` (1197-1314), `rendreBudget` (1750-1861), `rendreAvenir` (1909-2012), `carteResume` (886-889) ; `index.html` : ordre du hero et du bandeau (81-97), bouton Budget (245) ; `styles.css` : `.vue.mode-detail` (740, 994), bouton CSV (231), barre (195) | Un seul net et un seul mot « dettes » entre Aperçu, Revenu et Budget (navigateur) ; 320 px sur chaque page (H-09) ; identité 892 499 − (−40 000) = +932 499 affichée avec le même mot | M |
| **8. Accessibilité et contraste** | E-01, E-02, E-03/D-11, E-04, E-05, E-06, E-07, E-08/D-15, E-11 | `index.html` 407-409 (bouton Restaurer) ; `styles.css` : jetons sombres `--danger`, `--bon`, `--axe` (25, 97, 101), `.as-corps h2` (703), `.feuille`/`.assistant` (481, 693), hauteurs (185, 547, 576, 856) ; `js/interface.js` : `graphiqueLignes` (`aria-valuetext`, 172-195) ; `js/app.js` : seulement `#vn-composition` (`tabindex`) | Scénario thème sombre (H-09) avec contraste du bouton destructeur et du crochet ; Tab atteint « Restaurer une sauvegarde » ; focus jamais sur `body` dans un dialogue | S |
| **9. Sécurité de l'import et du cache** | F-02, F-03, F-04, F-06, F-07, F-08, F-10 | `js/app.js` : `fusion`, `migrer`, `restaurer`, `confirmerTransfert` (20-40, 3320-3350), `exporterPlan` CSV (3584-3590), chaînes des lignes 2402 et 2509 ; `js/verrou.js` 131 (plafond de décompression) ; `sw.js` 22 (types mis en cache, sans toucher `CACHE`) ; `.gitignore` | Import d'un fichier avec un âge hors borne : message, aucune écriture, application visible ; import avec `__proto__` ignoré ; CSV dont un nom commence par `=` | M |
| **10. Rendu par page** | I-01/G-06/I-02, I-03, I-04 | `js/app.js` : `tout()` (2041-2050), `ouvrir()` (3222-3227), garde-fou de `rendreChances` (2271) ; `js/interface.js` : largeur de `graphiqueLignes` (159) | Compteur : une navigation = un `calculer`, un seul `rendre*` ; graphique à la largeur réelle dès le premier affichage ; `monteCarlo` seulement sur `#avenir/projection` | M |
| **11. Découpage d'`app.js`** | G-02, G-03, G-06, G-07 (documentation) | Plan en dix étapes de `audits/cursor/G-code.md` : `js/lancement.js`, `js/page-*.js`, `js/feuilles.js`, `js/menage.js` ; `index.html` (balises), `sw.js` `FICHIERS` (sans toucher `CACHE`) | Les trois commandes à chaque étape ; aucun test nouveau | L |
| **12. Tests qui passent déjà** | H-02, H-05, H-06, H-07, H-08, et le commentaire C-18 | `tests/calculs.test.js` (annexe H, tests 2, 5, 6, 7, 8) ; `js/calc.js` 687 (une ligne de commentaire) | Ce sont les tests | S |

Paires qui partagent un fichier, dans des fonctions disjointes : lots 1 et 6 (`js/calc.js` : `simulerDettes` l. 739-741 pour le lot 1, le reste de la fonction pour le lot 6 ; à relire ensemble) ; lots 1, 4, 5, 7, 9 et 10 (`js/app.js`, fonctions distinctes) ; lots 2, 3, 6 (`js/calc.js`, fonctions distinctes) ; lots 2, 3, 5, 6 (`js/catalogues.js`, champs distincts) ; lots 7 et 8 (`styles.css`, règles distinctes ; `index.html`, blocs distincts). Le lot 11 déplace des fonctions entières d'`app.js` : il se fait **avant tous les autres lots qui touchent `app.js`, ou après qu'ils sont fusionnés**, jamais en même temps. Le lot 12 peut partir tout de suite.

Ordre conseillé si une seule personne corrige : 12, 1, 2, 4, 5, 3, 6, 9, 8, 7, 10, 11.

## 6. Décisions à prendre avant de corriger

Interprétations de la RAMQ (lot 3) :

1. **B-01.** Au-delà de 1 540 h, les heures de garde sur place sont-elles payées à 94 % en premier (lecture du rapport B des par. 5.02-5.05 de l'annexe XIV), ou l'excédent se partage-t-il au prorata comme aujourd'hui ? Sans confirmation, le lot 3 n'y touche pas.
2. **B-02.** Le champ « Patients transférés, déjà inscrits ailleurs » vise-t-il un simple changement de médecin (aucun supplément, forfaits au prorata) ou un transfert en bloc de la lettre d'entente no 304 (suppléments du guichet) ? Deux champs, ou un seul avec une case ?
3. **B-04, B-05.** Faut-il demander les effectifs du par. 4.16 pour le forfait de 7 500 $ / 15 000 $ ? Remplacer la case d'assiduité par les trois paliers 70/75/80 % ?
4. **B-10.** Quelle infolettre porte le 231,75 $ de l'aide ? Sinon, retirer le montant.

Impôt (lots 2 et 4) :

5. **A-03.** Ajouter un champ « je vis seule » ? Le supplément monoparental de 2 681 $ vaut-il pour un enfant mineur ?
6. **A-04.** Montrer les deux plafonds de prime (766 $ et 789 $) ou attendre l'annexe K 2026 ?
7. **A-06, A-07, A-08.** Garder 2,6 % et 3,15 % comme estimation marquée jusqu'aux publications ? Déductions médicaments et `fss.seuil1` : indexer les deux, ou aucun ? (Le test H-03 dépend de la réponse.)
8. **A-09, J-08.** Garder l'approximation du revenu de l'année courante pour l'ACE et l'Allocation famille ? Ajouter le crédit pour la solidarité et l'allocation pour l'épicerie, une fois chaque seuil recopié d'une page officielle ?
9. **A-10.** Relancer l'outil du ministère sur le couple 80 000 $ + 40 000 $ (écart de 40 $) ; ne rien changer au moteur d'ici là.

Dettes et projections (lots 1 et 6) :

10. **C-19.** Un taux de renouvellement à 0 veut-il dire « même taux » (comme aujourd'hui) ou 0 % ?
11. **C-13.** Quand les paiements dépassent le revenu, quel compte grossit du manque ?
12. **C-14.** Ajouter 0,5 point sur la part en actions dans Monte-Carlo (les normes 2026), même si la médiane dépasse alors la projection affichée ?
13. **C-22.** Le crédit d'intérêts d'études inutilisé est-il reporté (comme le dit le sommaire pour le comptable) ou perdu (comme le fait le moteur) ?
14. **C question 4.** L'encaisse et les objectifs dédiés doivent-ils rapporter 2,4 % (court terme des normes) ou 0 % ?
15. **C-02 / G question 2.** Une cotisation CELIAPP au-dessus de 8 000 $ est-elle ramenée à 8 000 $ ou seulement signalée ? Le report de droits inutilisés (au plus 8 000 $) est-il modélisé ?

Produit (hors lots, ou lot 5) :

16. **J-02.** Demander le taux et le début de remboursement du prêt d'études plutôt que 5 % sur 120 mois dès aujourd'hui ?
17. **J-03.** Une période datée sans revenu (congé parental, sabbatique) dans la projection et la trésorerie ?
18. **J-04.** Besoin d'invalidité avec dépenses et frais de cabinet ; source du 15 000 $ de frais au décès ?
19. **J-05.** Ajouter la rente du RRQ et la pension de la Sécurité de la vieillesse à l'année d'indépendance, avec le simulateur de l'Institut comme source ?
20. **J-06.** Comparer salaire et dividendes pour la société (RRQ, droits REER) ?
21. **J-10.** Un plan B « louer ou acheter » prêt à l'emploi, sans droits de mutation tant qu'un barème sourcé n'est pas ajouté ?

Comptes, sécurité, code :

22. **F-11.** Avant de coder le client des comptes : deux dérivations distinctes (verrou et serveur), et une réinitialisation par courriel qui ne détruit pas la seule copie en ligne. Section « Avant de coder les comptes » de `F-securite.md`.
23. **F-01.** L'hébergeur peut-il envoyer un en-tête `Content-Security-Policy` avec `frame-ancestors 'none'` ? Sinon, risque accepté à noter.
24. **F-09.** Épingler les actions GitHub par empreinte et installer Playwright comme dépendance de développement verrouillée ?
25. **G-07.** Renommer un jour `Wealthnord`, `boussole.v1`, `wealthnord.theme` (avec lecture de l'ancienne clé) ou documenter ?
26. **H question 1.** Ajouter maintenant les tests qui échouent (H-01, H-03, et ceux de l'annexe A), quitte à voir la suite rouge jusqu'aux lots 1 et 2, ou les ajouter avec chaque lot ?
27. **D-04, E-10.** Le bouton Installer reste-t-il sur chaque page de téléphone ? La barre du bas doit-elle passer après le contenu dans l'ordre de tabulation ?
28. **I-01.** Le rendu par page (lot 10) suffit-il, ou le découpage (lot 11) est-il voulu d'abord ?

## 7. État de départ des tests

Mesuré le 31 octobre 2026 sur `1fd682a`, après `.cursor/install.sh` (Node 22, Chromium de Playwright).

| Commande | Résultat |
|---|---|
| `npx eslint .` | 0 erreur, 0 avertissement |
| `node tests/calculs.test.js` | 202 vérifications réussies, 0 échec ; écart maximal avec l'outil officiel du ministère des Finances : 40 $ (impôt fédéral du couple 80 000 $ + 40 000 $, voir A-10) |
| `node tests/navigateur.test.js` | 235 vérifications réussies, 0 échec (30 scénarios) |
| `HORLOGE=2028-02-15 node tests/navigateur.test.js` | 235 vérifications, 0 échec (rapport K) ; la suite ne voit ni K-07 ni K-08 |

Les tests proposés qui échouent sur ce code, et qui doivent échouer tant que le lot n'est pas fait : H-01 (CELIAPP 8 000 $), H-03 (déductions médicaments 2027, selon la décision 7), A-01, A-02, A-03, A-04, A-05, A-08, A-12 de l'annexe A. Tous les autres tests des annexes A, C et H passent aujourd'hui et figent un comportement déjà juste.

## 8. Ce qui est vérifié et correct, en une page

- RAMQ : 18 tarifs de visite (manuel du 22 octobre 2026), forfaits et suppléments de l'EP 40 et de l'EP 42, demi-per diem, DMÉ, volume, polyvalence, tarif horaire 99,48 $, mixte 59,68 $ / 63,58 % / 24,87 $ / 62,15 %, forfait GMF 9,35 $, échelle de la FMRQ 2026 et 2027 avec primes (B).
- Impôt 2026 : barèmes, montant personnel de base et son écrêtement, abattement 16,5 % après crédits, RRQ (deux piliers, crédit et déduction), RQAP, assurance-emploi, FSS, frais de garde, ACE et Allocation famille, dividendes (3,42 % puis 2,69 %), douze cas au centime du calcul statutaire (A).
- Projections : paiement, solde, renouvellement, REER, privilège de janvier, réserve à 2,4 %, stratégies de remboursement, indépendance, trésorerie de douze mois, année 0 de la valeur nette, sous le cent (C).
- Sécurité : CSP stricte sans script en ligne, aucune ressource externe, PBKDF2 600 000 itérations et AES-GCM corrects, lien de transfert à longueur vérifiée, service worker « réseau d'abord » (F).
- Accessibilité : 0 violation axe (WCAG 2.2 AA, `target-size` activée) sur 17 vues en thème clair et sombre ; lien d'évitement, lexique, toast, verrou, mouvement réduit (E).
- Interface : les montants qui doivent concorder concordent (brut, net de l'année, surplus, identité de la valeur nette) ; aucun défilement horizontal à 390 px ; cinq onglets, résumé puis détail (D).
- Code : `calc.js` et `calculer` ne touchent pas la page ; 156 fonctions d'`app.js` toutes appelées ; les trois commandes passent (G, H).
