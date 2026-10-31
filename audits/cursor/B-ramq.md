# Audit B — Tarifs de la RAMQ et échelle de la FMRQ

Lecture du moteur (`js/calc.js`), des libellés (`js/catalogues.js`, `js/app.js`) et de la Brochure no 1 : 31 octobre 2026. Ce rapport ne modifie pas l’application.

Les montants de l’EP 40 et de l’EP 42 ont été lus dans la version HTML du 1er avril 2026 de la Brochure no 1. Les versions consolidées annoncées du 3 septembre au 28 octobre 2026 n’ont pas été ouvertes : l’adresse essayée pour le 28 octobre 2026 a renvoyé une page introuvable. Un accord de l’automne peut donc avoir bougé un chiffre. Quand c’est le cas, la ligne dit « source non atteinte ».

## 1. Résumé

Les montants de `MONTANTS_LIEU`, les 18 tarifs de visite, l’échelle de la FMRQ au 1er avril 2026 et au 1er avril 2027, et les paramètres horaires (1 540 h, 880 h, 71,8 %, garde à 94 % jusqu’à 528 h, 99,48 $, 59,68 $, 63,58 %, 24,87 $, 62,15 %, 9,35 $) concordent au cent près avec les sources citées plus bas.
Deux règles font manquer des sommes : la garde saisie en plus de la clinique est répartie au prorata au-delà de 1 540 h, au lieu d’être payée à 94 % (écarts de 3 451,16 $ et de 6 802,04 $), et un transfert en bloc ne reçoit aucun supplément d’inscription.
Le forfait de 7 500 $ ou 15 000 $ ignore la pondération du paragraphe 4.16, l’assiduité est une case à 80 % au lieu de l’échelle 50 % / 75 %, et la compensation de cabinet peut dépasser 64,80 $ le même jour civil.
Le mode composé de la Loi 2, issu de l’entente finale du 13 août 2026 entre la FMOQ et le gouvernement, n’est pas en vigueur et ses quanta ne sont pas publiés ; il n’est pas proposé comme fonction.
Les brochures postérieures au 1er avril 2026 n’ont pas été relues ligne à ligne.

## 2. Constats

Gravité : critique si le chiffre officiel est contredit pour un cas courant ; élevée si l’écart se chiffre en milliers de dollars dès que le champ est rempli comme son libellé l’invite ; moyenne si la règle officielle est incomplète et l’écart dépend du profil ; faible si le texte d’aide ou un secteur absent induit une erreur que la personne peut corriger elle-même. Effort : S, M ou L.

| Id | Gravité | Fichier et ligne | Constat | Preuve | Correction | Effort |
|---|---|---|---|---|---|---|
| B-01 | élevée | `js/calc.js` 351-358 ; affichage `js/app.js` 1134 et 1299 ; libellé `js/catalogues.js` 33 et 390-391 | Au-delà de 1 540 h, les heures de garde sur place saisies en plus de la clinique sont fondues dans l’excédent, puis réparties au prorata. L’annexe XIV paie à 94 % les heures de garde faites en excédent du plafond, jusqu’à 528 h, et le reste à 71,8 %. | Annexe XIV, par. 5.02, 5.03, 5.04 et 5.05, Brochure no 1, version du 1er avril 2026, lue le 31 octobre 2026 : <https://www.ramq.gouv.qc.ca/SiteCollectionDocuments/professionnels/manuels/104-brochure-1-omnipraticiens/Omnipraticiens_Brochure_no1-2026-04-01.html>. Le par. 5.02 met la garde faite à même les 35 premières heures de la semaine dans les 1 540 h à 100 %. Le champ dit « en plus de vos heures en clinique » : ces heures ne sont pas ces 35 heures, et la clinique remplit le plafond d’abord. Tarif 99,48 $ (même brochure, tarif horaire, art. 1.01, depuis le 1er octobre 2019). Moteur, `revenuGmfu`. Cas A : 42 sem. × 8 demi-journées × 3,5 h = 1 176 h de clinique + 600 h de garde = 1 776 h, excédent 236 h. Le moteur : 79,73 h à 94 % et 156,27 h à 71,8 %, perte 4 859,80 $. Lecture du par. 5.03 : les 236 h d’excédent sont de la garde, perte 1 408,64 $. Écart 3 451,16 $, au détriment de la personne. Cas B : 1 600 h de clinique + 400 h de garde, excédent 460 h. Le moteur : 92 h à 94 % et 368 h à 71,8 %, perte 10 872,77 $. Lecture : 400 h à 94 % et 60 h à 71,8 %, perte 4 070,72 $. Écart 6 802,04 $. Cas C : 1 540 h de clinique + 600 h de garde. Le moteur met 168,22 h à 94 % (le plafond de 528 h n’est pas atteint) et 431,78 h à 71,8 %, perte 13 116,86 $. Lecture : 528 h à 94 % et 72 h à 71,8 %, perte 5 171,37 $. | Remplir d’abord le plafond de 1 540 h avec les heures de clinique. Porter à 94 %, jusqu’à 528 h, les heures de garde qui tombent au-delà. Porter le reste de l’excédent à 71,8 %. Aligner les deux phrases d’écran sur ce partage. | M |
| B-02 | élevée | `js/calc.js` 287-293, 316-318 et 324-332 ; `js/catalogues.js` 351-352 | « Patients transférés, déjà inscrits ailleurs » ne verse aucun supplément et verse le forfait d’inscription en entier. L’aide du hors-guichet donne en exemple les patients d’un médecin retraité, qui relèvent en général de la lettre d’entente no 304, mais le moteur leur applique le code 19958. | Brochure no 1, 1er avril 2026, lue le 31 octobre 2026 (même adresse qu’en B-01). Lettre d’entente no 304, art. 4 d) : à la première visite, le médecin qui accepte le transfert peut facturer les suppléments 4.12 et 13.01. L’avis de facturation : 19957 non vulnérable ; 19959 vulnérable attribué par le GAMF ou par transfert en bloc ; 19960 très vulnérable dans les mêmes cas ; 19958 seulement si le vulnérable n’est pas attribué ainsi. Art. 4 f) i) et EP 40, par. 4.06 : le forfait d’inscription est partagé en mois entiers, le mois de la seconde inscription restant au premier médecin. Art. 4 f) ii) et par. 6.01 F : le forfait annuel de prise en charge suit, le mois du second médecin restant au premier. Le par. 4.08 (paiement entier) vise l’inscription nouvelle, pas ce cas. Le par. 4.13 refuse le supplément au patient déjà inscrit chez un autre médecin, hors les cas de cessation visés. Moteur, cabinet, première année, 100 patients vulnérables, tout le monde à la semaine 0 d’une année de 12 semaines. Transfert : suppléments 0 $, forfait d’inscription 1 185 $, forfait vulnérable 6 250 $. Guichet : suppléments 15 535 $ (100 × 155,35 $), mêmes forfaits. Hors guichet : suppléments 7 250 $ (100 × 72,50 $). Lecture de la lettre 304 pour une arrivée en janvier : suppléments 15 535 $, forfait d’inscription 11/12 × 1 185 $ = 1 086,25 $, forfait vulnérable 11/12 × 6 250 $ = 5 729,17 $. Écart de suppléments : 15 535 $ si le champ « transférés » est utilisé, 8 285 $ si l’exemple du médecin retraité est saisi en hors-guichet. | Deux cas distincts. Changement de médecin hors lettre 304 : aucun supplément, forfaits d’inscription et de vulnérabilité au prorata, le mois du transfert au premier médecin. Transfert en bloc : suppléments du guichet (19957, 19959, 19960), forfait d’inscription au prorata, forfait vulnérable dans la continuité des versements. Retirer l’exemple du médecin retraité de l’aide du hors-guichet. | M |
| B-03 | moyenne | `js/calc.js` 254-258 | Chaque demi-journée de sans rendez-vous est comptée comme une journée de compensation distincte, et une demi-journée de rendez-vous laissée seule aussi. Le plafond de 64,80 $ est par jour civil. | EP 40, par. 14.01, même brochure, depuis le 1er octobre 2019 : 32,40 $ pour au moins 6 patients inscrits dans la journée (code 19928), 64,80 $ pour 12 ou plus (19929), maximum 64,80 $ par journée (alinéa b). Avis : au sans rendez-vous, 10 et 20 patients. Moteur, `compensationCabinet`, 7 demi-journées à 12 patients et 1 sans rendez-vous à 20, 38 semaines : 324 $ par semaine (5 × 64,80 $), soit 12 312 $ par année. Quatre jours civils plafonnés donnent 4 × 64,80 $ × 38 = 9 849,60 $. Écart 2 462,40 $. L’exemple fictif (6 patients par demi-journée et 12 au sans rendez-vous) donne 259,20 $ par semaine, égal à 4 × 64,80 $ : il ne dépasse pas le plafond. | Plafonner à 64,80 $ chaque jour civil, rendez-vous et sans rendez-vous confondus. Le moteur ne connaît pas le calendrier : une case « le sans rendez-vous est le même jour qu’une demi-journée de rendez-vous » suffit pour le cas mesuré. | M |
| B-04 | moyenne | `js/calc.js` 231-235 | Le forfait de 7 500 $ ou de 15 000 $ compte les inscrits bruts. Le paragraphe 4.16 double certaines inscriptions avant de comparer aux seuils de 750 et de 1 000. | EP 40, par. 4.15 et 4.16, même brochure. Le par. 4.16 vaut « pour cette section » : patients A, B et C du GAMF et lettres d’entente no 321 des douze mois précédents, au double ; patients vulnérables inscrits dans les douze mois après une attribution du GAMF hors lettre 321, au double ; puis, si le nombre non pondéré atteint 500, les vulnérables non encore pondérés au-delà de 40 % des inscriptions, au double. Les patientes enceintes non inscrites qui ont eu la prise en charge et un suivi dans les délais du troisième alinéa comptent aussi, sans être inscrites. Le par. 15.02, lui, compte les inscrits qui donnent le forfait, sans cette pondération : les suppléments de 5,23 $ et suivants ne sont pas visés. `montantsVolume(500, 0)` = 0 $. Cinq cents inscriptions toutes comptées au double atteignent le seuil de 1 000 et le forfait de 15 000 $. La feuille ne demande ni la catégorie GAMF, ni la lettre 321, ni les grossesses non inscrites : le 15 000 $ n’est pas dû à toute clientèle de 500. | Ne pas inventer la pondération. Ajouter, pour le seul forfait de 7 500 $ / 15 000 $, les effectifs que la personne peut chiffrer (attributions du guichet des douze derniers mois, vulnérables au-delà de 40 % une fois 500 inscrits atteints). Laisser les suppléments du par. 15.01 sur le nombre brut. | L |
| B-05 | moyenne | `js/calc.js` 234 ; `js/catalogues.js` 30 et 357 | Sous 80 % d’assiduité, les suppléments par patient tombent à zéro. L’échelle officielle verse encore 50 % ou 75 %. La case est cochée par défaut, donc un taux de 70 % à 79 % reçoit 100 %. | EP 40, par. 15.03 et 15.05, même brochure, depuis le 1er janvier 2018 : 80 % donne 100 % des suppléments du par. 15.01 ; 75 % à 79 % en donne 75 % ; 70 % à 74 % en donne 50 %. Le forfait de 7 500 $ / 15 000 $ du par. 4.15 n’a pas ce test : le moteur le garde quand la case est décochée, ce qui est juste. `montantsVolume(1 200, 400)` : suppléments 8 629,50 $ (250 × 5,23 $ + 250 × 10,46 $ + 200 × 15,69 $ + 100 × 5,23 $ + 100 × 10,46 $), forfait 15 000 $. À 75 % : 6 472,13 $. Case décochée : 0 $. | Remplacer la case par trois taux, 70 %, 75 % et 80 %, appliqués aux seuls suppléments du par. 15.01. Laisser le forfait de volume entier. | S |
| B-06 | moyenne | `js/calc.js` 310 et 376-379 ; `js/catalogues.js` 339 | Choisir l’intervention de supervision ajoute quand même, au pourcentage du mixte, les « patients vus vous-même pendant la supervision ». L’annexe XXIII ne permet ces services qu’avant ou après le bloc, et interdit toute réclamation pour un service fait avec le résident pendant le bloc. | Annexe XXIII, section du GMF-U, point 3.1 ii), conditions 2 et 4, même brochure. Le tarif de supervision, lui, n’est pas doublé : un seul acte, quel que soit le nombre d’apprenants, et les visites des apprenants sont exclues de ce choix (voir la section 3). Moteur, établissement, 40 sem., 2 demi-journées d’enseignement, 4 h, 1 résident, 600 inscrits, visite de suivi à 36,95 $ (palier de 500, code de la colonne établissement), 63,58 %. Supervision : 17 311,51 $, identique avec ou sans les 3 patients. Ces 3 patients ajoutent 5 638,27 $ de visites au mixte (40 × 2 × 3 × 36,95 $ × 63,58 %). Le champ vaut 0 par défaut : l’exemple fictif ne contient pas cet écart. | Quand l’intervention de supervision est choisie, ne pas facturer les patients saisis comme vus pendant le bloc. Le libellé peut demander les patients vus avant ou après le bloc : ceux-là restent facturables. | S |
| B-07 | faible | `js/calc.js` 155 et 269 ; `js/catalogues.js` 397 | Le plafond payé est 3,5 h par demi-journée, y compris l’après-midi. L’après-midi officiel va jusqu’à 5 h (12 h à 18 h). | Même brochure, annexe XXIII, GMF-U, point 3.1 ii) : 3,5 h l’avant-midi (8 h à 12 h, code 42096), 5 h l’après-midi (12 h à 18 h, code 42097), 3,5 h le soir (18 h à 24 h, code 42098). L’aide du champ le dit déjà. Le défaut de `supervisionMaxH` reste 3,5. Moteur, 40 sem. × 2 demi-journées, heure saisie 4 h, tarif 99,48 $ × 62,15 % : payé 3,5 h, soit 17 311,51 $. La demi-heure manquante, si la demi-journée est l’après-midi, vaut 2 473,07 $. La personne peut monter le champ à 5. | Proposer 5 h lorsque la demi-journée est l’après-midi, sans dépasser l’heure saisie. Garder 3,5 h le matin et le soir. | S |
| B-08 | faible | `js/calc.js` 259-260 | Le DMÉ verse les licences (459,90 $) et, hors GMF, les équipements (287,45 $). Il omet le lien Internet et le commutateur, 700,35 $ par trimestre, hors GMF, réclamable par un seul médecin du cabinet. | EP 40, par. 17.01, même brochure : 19976, 287,45 $, taxes incluses ; 19977, 700,35 $, taxes incluses, « que par un seul médecin du cabinet » ; 19978, 459,90 $, taxes incluses. Aucun de ces montants n’est soumis aux annexes XII, XII-A et XX. Moteur, hors GMF, au moins 150 inscrits : 4 × (459,90 $ + 287,45 $) = 2 989,40 $. Le 700,35 $ manque, soit 2 801,40 $ par année pour le médecin du cabinet qui le réclame. Le par. 17.02 (médecin non membre qui fait le sans rendez-vous d’un GMF-AR) verse 459,90 $ plus taxes, code 19979 : absent lui aussi. L’ajouter d’office majorerait chaque cabinet hors GMF. | Case facultative pour le 19977, hors GMF, avec la phrase « un seul médecin du cabinet ». Ne pas l’ajouter au calcul automatique. Le 19979 reste hors calcul tant que la feuille ne décrit pas ce sans rendez-vous. | S |
| B-09 | faible | `js/calc.js` 242 ; `js/catalogues.js` 299-307 | La polyvalence ne porte que sur l’urgence, l’hospitalisation, l’obstétrique, les soins palliatifs et le CHSLD. L’EP 40 y ajoute d’autres secteurs, et les types « garde » et « autre » du catalogue n’y entrent pas. | EP 40, par. 16.01, même brochure : urgence (CH ou CLSC du réseau de garde), malades admis, CHSLD, obstétrique, centre de détention, centre jeunesse, centre de réadaptation, soins palliatifs, traitement des services SLE en milieu hospitalier ; évacuation aéromédicale réputée urgence ; constats de décès et support en ligne préhospitaliers ; santé publique si la personne participe à la garde en disponibilité rémunérée. Les cinq secteurs présents, les seuils, le facteur 2,5 au-delà de 245 vulnérables et l’exclusion de la majoration territoriale sont justes (section 3). Une activité classée « autre » ou « garde » reçoit 0 %. | Ajouter ces secteurs à la liste des activités qui prennent le pourcentage, dès que la personne y inscrit un revenu. Ne pas inventer le revenu du secteur. | M |
| B-10 | faible | `js/catalogues.js` 417 | L’aide de la prime ponctuelle cite « par exemple 231,75 $ » pour l’inscription individuelle de 2026. Aucune page de la RAMQ ouverte ce jour ne porte ce montant. Le moteur, lui, part de 0. | Le champ `primeInscription` vaut 0 dans l’exemple et n’entre dans `revenuGmfu` que si la personne écrit un montant (`js/calc.js` 332). L’infolettre dont le titre est « Montant forfaitaire pour l’augmentation de l’inscription individuelle et collective » (actualité du 18 septembre 2026) n’a pas pu être ouverte : l’adresse devinée a renvoyé une page introuvable. Source du 231,75 $ : non atteinte. Un article de presse n’est pas retenu comme tarif. | Retirer le montant de l’aide tant que l’infolettre de la RAMQ n’est pas citée. Laisser 0. | S |

## 3. Vérifié et correct

Consultation du 31 octobre 2026. « App » est la valeur dans `js/calc.js`. « Officiel » est le montant lu. Sauf mention, la source des forfaits, suppléments, demi-per diem, volume, polyvalence, compensation, DMÉ et du mode mixte est la Brochure no 1, version du 1er avril 2026 :

<https://www.ramq.gouv.qc.ca/SiteCollectionDocuments/professionnels/manuels/104-brochure-1-omnipraticiens/Omnipraticiens_Brochure_no1-2026-04-01.html>

Les dates entre parenthèses sont celles que cette version imprime encore (1er octobre 2019, 1er janvier 2019 ou 1er septembre 2018). Elles n’ont pas été revérifiées dans une brochure plus récente.

### Visites, déjà contrôlées

Les 18 tarifs de `TARIFS_LIEU` concordent au cent près avec le Manuel des médecins omnipraticiens, rémunération à l’acte, version du 22 octobre 2026 :

<https://www.ramq.gouv.qc.ca/SiteCollectionDocuments/professionnels/manuels/syra/medecins-omnipraticiens/100-facturation-omnipraticiens/manuel-omnipraticiens-remuneration-acte.html>

Colonnes : moins de 500 inscrits, puis 500 ou plus. Cabinet, puis CLSC ou GMF-U.

| Codes | Cabinet | CLSC ou GMF-U |
|---|---|---|
| 15803 / 15804, suivi | 42,85 $ ; 49,15 $ | 32,25 $ ; 36,95 $ |
| 15823 / 15824, suivi, patient vulnérable | 53,50 $ ; 59,80 $ | 40,50 $ ; 45,20 $ |
| 15819 / 15820, périodique, patient vulnérable | 96,35 $ ; 112,40 $ | 72,65 $ ; 84,80 $ |
| 15813 / 15814, périodique pédiatrique | 66,90 $ ; 75,85 $ | 50,30 $ ; 57,00 $ |
| 15811 / 15812, suivi de grossesse | 50,20 $ ; 57,00 $ | 37,75 $ ; 42,85 $ |
| 15801 / 15802, prise en charge | 85,75 $ ; 99,40 $ | 64,50 $ ; 74,75 $ |
| 15821 / 15822, prise en charge, patient vulnérable | 96,35 $ ; 110,00 $ | 72,65 $ ; 82,90 $ |
| 15765 / 15766, sans rendez-vous mineure | 20,40 $ ; 23,55 $ | 15,30 $ ; 17,70 $ |
| 15773 / 15774, sans rendez-vous complexe | 40,80 $ ; 47,05 $ | 30,65 $ ; 35,40 $ |

### Échelle de la FMRQ

Avis de la RAMQ du 16 juillet 2026 :

<https://www.ramq.gouv.qc.ca/fr/professionnels/actualites/2026-07-16/modification-remuneration-medecin-resident>

| Échelle dans le code | Salaires, niveaux 1 à 6 | Garde | Enseignement |
|---|---|---|---|
| 2026-04-01 | 58 793 $ ; 64 880 $ ; 70 968 $ ; 77 054 $ ; 83 141 $ ; 89 229 $ | 725 $ | 286 $ |
| 2027-04-01 | 60 851 $ ; 67 151 $ ; 73 452 $ ; 79 751 $ ; 86 051 $ ; 92 352 $ | 750 $ | 296 $ |

Les niveaux 7 et 8 reprennent le niveau 6. Treize périodes. `salaireResident`, niveau 1 au 1er avril 2026, les deux primes : salaire 58 793 $, garde 9 425 $, enseignement 3 718 $, total 71 936 $.

Écart écarté. L’échelle du code au 1er avril 2025 (57 296 $ … 86 957 $ ; garde 706 $ ; enseignement 279 $) ne reprend pas la majoration de 0,11 % du 31 mars 2026 (57 359 $ … ; garde 707 $). Elle ne vaut qu’une journée, avant l’échelle du 1er avril 2026. Aucun constat.

### Tarif horaire, mixte, GMF

Page de la RAMQ sur le tarif horaire, reprise telle quelle :

<https://www.ramq.gouv.qc.ca/fr/professionnels/medecins-omnipraticiens/facturation/Pages/tarif-horaire.aspx>

1 540 h à 100 %, jusqu’à 880 h de plus autorisées, puis 71,8 %. Garde sur place au-delà du plafond : 94 %, jusqu’à 528 h. La même brochure le redit à l’annexe XIV, par. 5.02, 5.03, 5.04, 5.05 et 5.10, et fixe le taux à 99,48 $ depuis le 1er octobre 2019 (art. 1.01). Le partage de l’excédent, lui, est le constat B-01. Le plafond n’est pas réduit pour une année partielle (question 7).

| Poste | App | Officiel | Source dans la brochure du 1er avril 2026 |
|---|---|---|---|
| Tarif horaire | 99,48 $ | 99,48 $ | Annexe XIV, art. 1.01, 1er octobre 2019 |
| Forfait horaire du mixte | 59,68 $ | 59,68 $ | Annexe XXIII, première heure, code 42094 |
| Pourcentage des services médicaux | 63,58 % | 63,58 % | Annexe XXIII, section B-1, services médicaux |
| Supervision, par 15 minutes | 24,87 $ | 24,87 $ | Annexe XXIII, GMF-U, codes 42096 à 42098 ; 99,48 $ l’heure |
| Pourcentage des services sur base de temps | 62,15 % | 62,15 % | Même section, services sur base de temps |
| Forfait GMF, code 08875 | 9,35 $ | 9,35 $ | EP 33, annexe V, 1er octobre 2019, une fois par année civile, par GMF, par patient, à la première visite |

Moteur, 1 000 inscrits, 80 % vus, membre d’un GMF : 7 480 $ = 800 × 9,35 $. La majoration territoriale ne s’y applique pas dans le moteur. La brochure, sur ce forfait, ne dit pas si l’annexe XII s’applique (question 1).

### EP 40 et EP 42, montants du moteur

Cabinet, puis établissement. Tous concordent.

| Poste | App | Officiel | Endroit |
|---|---|---|---|
| Forfait d’inscription, par. 4.01, 1er janvier 2019 | 11,85 $ ; 8,95 $ | 11,85 $ ; 8,95 $ | EP 40 |
| Forfait vulnérable, groupe I, par. 6.01, 1er octobre 2019 | 62,50 $ ; 47 $ | 62,50 $ ; 47 $ | EP 40 |
| Groupe II, 150 % | 93,75 $ ; 70,50 $ par le facteur 1,5 | 93,75 $ ; 70,50 $ | EP 40 |
| Groupes III et IV, 200 % | 125 $ ; 94 $ | 125 $ ; 94 $ | EP 40 |
| Supplément 19957, non vulnérable, par. 4.12 A, 1er septembre 2018 | 23,55 $ ; 19,55 $ | 23,55 $ ; 19,55 $ | EP 40 |
| 19958, vulnérable hors guichet, par. 4.12 B | 72,50 $ ; 60,15 $ | 72,50 $ ; 60,15 $ | EP 40 |
| 19959, vulnérable du guichet, par. 4.12 C | 155,35 $ ; 128,90 $ | 155,35 $ ; 128,90 $ | EP 40 |
| 19960, très vulnérable du guichet seulement, par. 13.01 | 310,65 $ ; 257,80 $ | 310,65 $ ; 257,80 $ | EP 40 |
| Forfait de responsabilité, par. 6.02, 1er octobre 2019 | 10,60 $ ; 8,25 $ | 10,60 $ ; 8,25 $ | EP 40 |
| Examen d’un enfant de 0 à 5 ans, par. 8.01, code 08877 | 17,05 $ ; 13,35 $ | 17,05 $ ; 13,35 $ | EP 40 |
| Suivi de grossesse, par. 7.02 B, codes 15144 / 15145 | 11,40 $ ; 8,95 $ | 11,40 $ ; 8,95 $ | EP 40 |
| Premier trimestre, une fois, par. 7.02 A, code 15159 | 47,40 $ ; 35,60 $ | 47,40 $ ; 35,60 $ | EP 40 |
| Demi-per diem, liste 1, résident puis externe, par. 5.01 | cabinet 55,35 $ / 66,45 $ ; établissement 41,45 $ / 49,85 $ | identique | EP 42 |
| Demi-per diem, liste 2, par. 5.02 | cabinet 86,95 $ / 98,00 $ ; établissement 65,20 $ / 73,55 $ | identique | EP 42 |
| Compensation, par. 14.01, codes 19928 / 19929 | 32,40 $ ; 64,80 $ | 32,40 $ ; 64,80 $ | EP 40 |
| Seuils du sans rendez-vous | 10 et 20 patients | 10 et 20 patients | avis du par. 14.01 |
| DMÉ, licences, par. 17.01, code 19978 | 459,90 $ par trimestre | 459,90 $, taxes incluses | EP 40 |
| DMÉ, équipements hors GMF, code 19976 | 287,45 $ par trimestre | 287,45 $, taxes incluses | EP 40 |
| DMÉ, Internet et commutateur, code 19977 | absent (B-08) | 700,35 $, taxes incluses | EP 40 |
| Forfait de volume, par. 4.15 | 7 500 $ de 750 à 999 ; 15 000 $ à 1 000 et plus | identique | EP 40 |
| Suppléments par inscrit au-delà de 500, 750, 1 000 et 1 500, par. 15.01, 1er janvier 2019 | 5,23 $ ; 10,46 $ ; 15,69 $ ; 20,92 $ | identique | EP 40 |
| Suppléments par vulnérable au-delà de 200, 300 et 500 | 5,23 $ ; 10,46 $ ; 15,69 $ | identique | EP 40 |
| Polyvalence, par. 16.02, année 5 et suivantes | 2,5 % dès 700 ; 5 % dès 1 000 ; 10 % dès 1 500 | identique | EP 40 |
| Seuils des années 1 à 4, par. 16.04 | 100/200/300 ; 250/400/600 ; 400/600/900 ; 550/800/1 200 | identique | EP 40 |
| Pondération, par. 16.03 | au-delà de 245 vulnérables, chacun compte pour 2,5 | identique | EP 40 |

La majoration temporaire du par. 18.01 a pris fin le 30 avril 2021. Le moteur garde les montants de septembre 2018 et d’octobre 2019, pas les montants majorés de cette fenêtre.

Contrôles du moteur, le 31 octobre 2026.

- Suppléments, 100 patients, 40 % non vulnérables, 50 % vulnérables, 10 % très vulnérables, cabinet. Hors guichet : 5 292 $ = 40 × 23,55 $ + 60 × 72,50 $. Guichet : 11 816 $ = 40 × 23,55 $ + 50 × 155,35 $ + 10 × 310,65 $. Le très vulnérable hors guichet reçoit 19958, pas 19960. C’est le texte du par. 13.01. L’erreur de la lettre 304 est le constat B-02, pas ce partage.
- Groupe II, 100 patients, cabinet, année entière : 9 375 $ = 100 × 93,75 $. Mélange en établissement, 60 % vulnérables dont la moitié en groupes III ou IV, plus 40 % très vulnérables : 7 990 $.
- Forfait vulnérable d’une inscription nouvelle, mois compris (par. 6.01 E et second alinéa du par. 6.01 D). Cabinet, 120 patients, 12 semaines. Tous à la semaine 0 : 7 500 $. Étalés sur les 12 semaines : 4 062,50 $. Le mois du transfert, lui, relève du constat B-02.
- Tranches de volume, marginales. `montantsVolume(1 000, 300)` : forfait 15 000 $, suppléments 4 445,50 $. Frontières : 749 inscrits donnent 0 $, 750 donnent 7 500 $, 999 donnent 7 500 $, 1 000 donnent 15 000 $. Un inscrit de plus que 500 ajoute 5,23 $. La case d’assiduité décochée garde le forfait et met les suppléments à 0 (le barème manquant est le constat B-05).
- Polyvalence. Année 5 : 699 donne 0 %, 700 donne 2,5 %, 1 000 donne 5 %, 1 499 donne 5 %, 1 500 donne 10 %. Année 1 : 100, 200 et 300 donnent 2,5 %, 5 % et 10 %. Six cents inscrits et 400 vulnérables : poids 833 après arrondi, taux 2,5 %. La base exclut la majoration territoriale : à 15 % de majoration, une urgence de 1 000 $ devient 1 150 $ d’activité, et la polyvalence reste 50 $ (5 % de 1 000 $).
- Palier de 500. Quatre cent quatre-vingt-dix-neuf inscrits : aucune semaine au tarif haut. Cinq cents, et 499,999 : toutes les semaines au tarif haut. Un départ à 490 plus 10 arrivées sur 46 semaines finit à 499,99999999999943 avec zéro semaine haute. Le seuil ne promeut pas un effectif entier de 499. Écart écarté.
- Majoration territoriale, 15 %. Les visites, le forfait d’inscription et le forfait vulnérable sont multipliés par 1,15 (par. 4.02, par. 6.01 C, annexe XXIII par. 2.10 pour l’ensemble de cette annexe, EP 42 par. 5.07 pour le demi-per diem). Les suppléments, le volume, le forfait GMF, la compensation et la polyvalence ne le sont pas. La compensation et le DMÉ sont exclus par les par. 14.01 c) et 17.01. La polyvalence exclut les annexes XII et XII-A par le par. 16.02. Pour les suppléments 19957 à 19960 et le forfait 08875, la brochure lue ne tranche pas (question 1).
- Demi-per diem. Dix semaines, 2 demi-journées, 1 résident et 1 externe, liste 2, cabinet : 3 699 $ = 10 × 2 × (86,95 $ + 98 $). Il s’ajoute à l’autre rémunération (EP 42, par. 4.01). Il ne dépend pas du nombre de patients vus par l’apprenant (par. 5.04). Les 4,5 et 2,5 patients par demi-journée sont une hypothèse de l’aide (« en moyenne 4 à 5 », « 2 à 3 »), pas un tarif.
- Supervision et visites des apprenants, au mixte, sont un choix exclusif. Même scénario qu’en B-06, option « visites » : supervision 0 $, et les visites du mixte dépassent l’option « intervention » de 8 457,41 $, soit exactement 360 visites d’apprenants × 36,95 $ × 63,58 %. Le forfait horaire pendant ces heures, plus le pourcentage de l’acte de supervision, est la formule du par. 2.05 et du par. 2.06. L’interdiction écrite vise le cumul du forfait horaire et de l’acte à 100 % au sans rendez-vous, pour la même période (point 4 de la section GMF-U). Ce n’est pas un double compte de l’acte de supervision.
- Compensation en établissement : 0 $. DMÉ, première année du permis, 0 inscrit, membre d’un GMF : 1 839,60 $ = 4 × 459,90 $. Sous 150 inscrits, hors première année : 0 $.
- Frais de cabinet. Le pourcentage s’applique au total moins la compensation, moins les activités, moins la polyvalence, moins les autres revenus. Cas cabinet, 30 % : total 137 953,40 $, compensation 11 689,20 $, activités 11 500 $, polyvalence 287,50 $, autres 500 $, base 113 976,70 $, frais 34 193,01 $. La formule d’`js/app.js` 537-539 reprend la compensation du mode à l’acte pour les trois modes : c’est le même montant, il est commun.
- Grossesses. `VISITES_PAR_GROSSESSE` = 10 n’est pas un tarif. Il ne sert qu’au taux horaire, quand le nombre de grossesses est vide. Cent suivis donnent alors 10 prises en charge au premier trimestre. Le supplément 15159, lui, est bien une fois par grossesse.
- Examens de responsabilité, enfant et grossesse : ajoutés au taux horaire. À l’acte et au mixte, le commentaire du moteur les tient pour compris dans le tarif de visite. Le par. 7.02 dit aussi que le seul supplément de suivi de grossesse peut être réclamé à l’acte et au mixte avec l’intervention clinique individuelle (question 6).

## 4. Questions pour la personne

1. Les suppléments 19957 à 19960 et le forfait 08875 reçoivent-ils l’annexe XII ou XII-A ? Les par. 4.02 et 6.01 C l’appliquent aux forfaits d’inscription et de vulnérabilité. Les par. 14.01 c) et 17.01 l’excluent pour la compensation et le DMÉ. Les paragraphes des suppléments et de l’EP 33, dans la brochure lue, ne le disent pas. Le moteur ne les majore pas.
2. Le champ « Patients transférés, déjà inscrits ailleurs » vise-t-il un simple changement de médecin, hors lettre d’entente no 304 ? Le libellé dit « pas de supplément », ce qui suit le par. 4.13. La lettre 304 dit le contraire pour un transfert en bloc (B-02).
3. L’assiduité doit-elle devenir l’échelle 70 % / 75 % / 80 % du par. 15.05, plutôt qu’une case (B-05) ?
4. Le forfait de 7 500 $ / 15 000 $ doit-il tenir compte du par. 4.16 ? La feuille ne demande pas la catégorie du GAMF ni la lettre d’entente no 321 (B-04).
5. Quelle infolettre de la RAMQ porte le 231,75 $ de l’aide ? Le corps de l’actualité du 18 septembre 2026 n’a pas été ouvert (B-10).
6. Le supplément de suivi de grossesse, 11,40 $ ou 8,95 $, est-il déjà dans le tarif 15811 / 15812 ? Le par. 7.02 permet de le réclamer à l’acte et au mixte avec l’intervention clinique individuelle. Le moteur ne l’ajoute qu’au taux horaire. Le tableau-synthèse des visites n’a pas été relu sur ce point.
7. Faut-il ramener 1 540 h et 528 h au nombre de jours de l’avis de service quand l’année au tarif horaire est partielle (annexe XIV, par. 5.09) ? Le moteur garde les deux plafonds entiers. L’autorisation de 880 h de plus (par. 5.10) n’est pas une case.
8. Les revenus d’activité saisis sont-ils déjà majorés selon le territoire ? Le moteur applique `majorationPct` une fois de plus sur ces revenus, et sur les heures, les visites, la supervision et les demi-per diem.
9. Les versions de la Brochure du 3 septembre au 28 octobre 2026 ont-elles changé un montant de l’EP 40 ou de l’EP 42 ? Elles n’ont pas été lues. Le renouvellement de l’Accord-cadre du 3 septembre 2026 et l’EP 33 du 10 septembre 2026 sont les plus susceptibles de toucher un forfait. Le 9,35 $ n’a été lu que dans le fichier du 1er avril 2026.
10. Une part de soir, de nuit ou de fin de semaine doit-elle entrer dans le calcul ? L’annexe XX et les pourcentages du point 5 de la section GMF-U (25,17 %, 40,89 %, 51,9 % sur le supplément d’honoraires) ne sont pas dans la feuille. Aucune fonction nouvelle n’est proposée ici.

## 5. Annexe

### Loi 2, mode composé

L’entente finale entre la FMOQ et le gouvernement du Québec est annoncée le 13 août 2026. Elle n’est pas opérationnelle : les quanta restent à fixer, et la RAMQ doit encore la mettre en œuvre. L’infolettre de la FMOQ du 28 octobre 2026 indique que les quanta sont toujours en discussion et qu’ils ne figurent pas dans la capsule explicative. Aucune page du gouvernement ni de la RAMQ consultée le 31 octobre 2026 ne publie ces montants. Le moteur ne calcule pas ce mode, et le présent audit ne le propose pas comme fonction.

Pages lues :

- <https://www.fmoq.org/dossier-actualites/nouveau-mode-de-remuneration-en-premiere-ligne-une-entente-est-conclue/>
- <https://fmoq.org/infolettres/fmoq/2026/infolettre-13-aout-2026/>
- <https://www.fmoq.org/infolettres/fmoq/2026/infolettre-28-octobre-2026/>
- <https://www.fmoq.org/infolettres/fmoq/2026/infolettre-27-octobre-2026/>
- <https://www.fmoq.org/infolettres/fmoq/2026/infolettre-2-septembre-2026/>

Quanta du mode composé : source non atteinte.

### Mises à jour 2026 qui peuvent changer un montant

Page des manuels, lue le 31 octobre 2026 :

<https://www.ramq.gouv.qc.ca/fr/professionnels/medecin-omnipraticien-omnipraticienne/manuels-guides>

Le corps de ces mises à jour n’a pas été ouvert, sauf les quatre infolettres nommées à la fin. La liste est celle de la page, pas une relecture des tarifs.

Brochure no 1, mises à jour 2026 annoncées sur la page : 28 octobre, accord 826 (impression) ; 27 octobre, accord 822 ; 22 octobre, amendements 215 et 216 ; 9 octobre, amendement 217 ; 1er octobre, accords 824 et 825 ; 17 septembre, lettres d’entente 398 et 399 ; 11 septembre, accord 823 ; 10 septembre, EP 33 ; 3 septembre, renouvellement de l’Accord-cadre 2023-2028 ; 20 août, lettre d’entente 387 ; 23 juillet, accords 818, 820 et 821 ; 7 juillet, accord 817 ; 23 juin, prolongation de l’accord 784 ; 15 juin, mise à jour administrative ; 11 juin, accord 819 ; 5 juin, prolongation de la lettre d’entente 367 ; 17 mars, lettres d’entente 381 et 382 ; 12 février, amendement 210 ; 6 février et 20 janvier, prolongations des lettres 381 et 382 ; 15 janvier, accords 811 et 771.

Rémunération à l’acte, 2026 : 28 octobre, amendement 217, impression marquée « à venir » sur la page ; 22 octobre, amendements 215 et 216, version déjà utilisée pour les 18 tarifs de visite ; 9 octobre, amendement 217 ; 1er octobre, accord 824 ; 17 septembre, amendement 214 ; 5 juin, 14 mai et 1er mai, mises à jour administratives ; 15 avril, amendement 208 ; 9 avril, amendement 207.

Les accords 822 et 826 (27 et 28 octobre) s’ajoutent à la liste demandée (amendements 207, 208, 210, 214 à 217, accords 811 et 817 à 825, lettres 381, 382, 387, 398 et 399, Accord-cadre du 3 septembre, EP 33 du 10 septembre). Tous ces numéros figurent sur la page.

Infolettres dont le PDF a été lu, et qui ne changent pas les tarifs de visite ni les forfaits de l’EP 40 :

- info021-26, 8 mai 2026, lettre d’entente no 321 : les modalités de rémunération sont inchangées ; le changement est administratif (attribution en bloc du GAMF, inscription sans visite), rétroactif au 1er février 2026. <https://www.ramq.gouv.qc.ca/SiteCollectionDocuments/professionnels/infolettres/2026/info021-26.pdf>
- info236-25, 8 janvier 2026 : cotisations au RRQ, au RQAP et à l’assurance-emploi des médecins à honoraires fixes, pas un tarif de visite.
- info252-25 : démarche pour un acte non tarifé, pas un taux de médecine de famille.
- info296-25 : modification de l’Accord-cadre des médecins spécialistes, pas des omnipraticiens.

Actualités dont le titre a été vu le 31 octobre 2026 et dont le corps n’a pas été ouvert : 18 septembre, « Changements tarifaires pour certains services médico-administratifs et nouveau service » ; 18 septembre, « Montant forfaitaire pour l’augmentation de l’inscription individuelle et collective » ; 4 septembre, relevés corrigés du supplément au volume ; 23 octobre, AMM et ÉVAQ ; 30 octobre et 14 octobre, échoguidage. L’avis du 16 juillet 2026 sur la rémunération des médecins résidents est celui de la section 3.
