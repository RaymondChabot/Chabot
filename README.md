# WealthMorand

Votre boussole financière.

Application web statique pour les médecins de famille en début de
pratique : revenu, impôt, budget du ménage, remboursement des dettes et
valeur nette.

## Confidentialité

- Le code ne contient **aucune donnée personnelle**. Les valeurs affichées
  au premier lancement sont un exemple fictif.
- Les données saisies restent dans le navigateur
  (`localStorage`). La page ne charge aucune ressource externe et n'envoie
  rien à un serveur.
- **Exporter une sauvegarde** (page Données) crée une copie de vos données ;
  **Restaurer une sauvegarde** la recharge sur un autre appareil.
- **Passer à un autre appareil** (page Données), sans compte : un lien qui
  contient les données compressées et chiffrées (AES-GCM 256 bits, clé
  tirée par PBKDF2-SHA-256 d'un code au hasard de 16 caractères, 80 bits).
  Les données sont dans le fragment du lien (après `#`), que le navigateur
  n'envoie jamais au serveur ; le code n'est affiché que sur l'appareil qui
  envoie. L'autre appareil ouvre le lien (ou le colle dans Données,
  « Recevoir avec un lien »), entre le code, voit ce qu'il reçoit, puis
  confirme le remplacement. Un lien coupé ou un mauvais code est refusé.
- **Verrou par phrase de passe** (facultatif, page Données) : les données
  gardées dans le navigateur sont chiffrées (AES-GCM 256 bits ; clé tirée de
  la phrase par PBKDF2-SHA-256, 600 000 itérations, sel au hasard). L'app
  demande la phrase à l'ouverture et après 1 à 60 minutes sans utilisation ;
  les sauvegardes exportées sont chiffrées avec la même phrase. La phrase
  n'est gardée nulle part : oubliée, elle ne se retrouve pas (on peut
  effacer les données de l'appareil et restaurer une sauvegarde).
- Ne versez jamais un fichier de données dans ce dépôt : `.gitignore`
  bloque les fichiers `*donnees*.json`.

## Ce qu'elle calcule

Pour tout médecin de famille au Québec, dans tous les milieux : seul ou
en couple (mariés ou conjoints de fait), avec ou sans enfants,
propriétaire ou locataire, travail autonome ou pratique incorporée.

Au premier lancement, un **assistant de départ** pose quelques questions
(famille, enfants, pratique, logement, dettes) et bâtit le point de départ
à partir des réponses ; l'exemple fictif reste offert. La carte **Votre
portrait** de l'aperçu montre ce qui est rempli et propose la suite. Des conjoints de
fait ne forment un couple pour l'impôt qu'après 12 mois de vie commune ou
avec un enfant commun : avant, chacun est imposé seul.

L'essentiel suffit pour commencer ; le bouton **Optimiser** du panneau
Revenu affiche tous les détails.

- **Revenu** : pratique principale en GMF ou clinique privée (à l'acte,
  frais de cabinet), en GMF-U ou en CLSC (taux horaire, mode mixte ou à
  l'acte), avec les tarifs de la RAMQ : demi-journées de rendez-vous et de
  sans rendez-vous (au mixte et à l'acte, chaque patient est payé au tarif
  de la visite ponctuelle, mineure ou complexe, plus bas qu'un suivi),
  patients, prise en charge
  de nouveaux patients (la première année ; puis, l'année type, ceux qui
  remplacent les départs, avec leurs suppléments d'inscription), patients
  vulnérables et très vulnérables. En GMF-U :
  résidents (4 à 5 patients par demi-journée) et externes (2 à 3), sous
  un même libellé « Apprenants supervisés » mais comptés à part, car leur
  demi-per diem diffère (41,45 $ et 49,85 $ en établissement), selon le
  lieu et la région ; au mixte, intervention de
  supervision ou visites des apprenants ; à l'acte, visites des
  apprenants. Taux horaire plafonné à 1 540 heures par année à 100 %
  (dépassement autorisé modifiable). Montants liés au volume de patients
  et majoration de la pratique polyvalente sur les activités en
  établissement. Tous les tarifs, forfaits et suppléments se modifient ;
  majoration selon le territoire. En plus : activités en établissement
  (urgence, hospitalisation, obstétrique, soins palliatifs, CHSLD, gardes,
  autre), par semaine, par mois, par année ou toutes les N semaines, au
  revenu par jour ou aux patients par jour × revenu par patient ; autres
  revenus (formulaires, expertises, médico-administratif, enseignement,
  location, placements) et lignes libres.
- **Impôt 2026** : fédéral et Québec, RRQ, RQAP, Fonds des services de
  santé ; société et dividendes ; partenaire salarié ou à son compte et
  transferts de crédits ; allocations
  familiales, prime d'assurance médicaments, REER, CELIAPP, société ;
  frais de garde (garderie ou CPE, camps de jour, gardiennage du budget) :
  crédit remboursable du Québec selon le revenu familial (78 % à 67 %,
  plafonds de 12 525 $ et 6 305 $ par enfant ; sans la contribution
  réduite d'une place subventionnée) et déduction fédérale du conjoint
  au revenu le moins élevé (8 000 $ et 5 000 $, au plus les 2/3 de son
  revenu gagné) ;
  dépenses professionnelles en un total ou ligne par ligne (Collège des
  médecins, FMOQ, ACPM, formation, équipement…).
- **Budget et dettes** : une case par dépense récurrente (plus de 70
  postes) ou un total estimé par catégorie ; avalanche,
  hybride ou boule de neige ; hypothèques à intérêt composé deux fois par
  année, paiement recalculé au renouvellement, droit annuel de
  remboursement anticipé.
- **Patrimoine** : bilan d'aujourd'hui (ce que vous possédez, ce que vous
  devez, autres actifs libres comme un chalet ou des parts de clinique) ;
  scénarios prudent, réaliste et optimiste, chaque année en dollars de
  l'année (paliers d'impôt indexés, enfants qui vieillissent) ; valeur
  nette sur 10 à 30 ans ; relevés de la valeur nette comparés à un plan de
  référence ; objectifs d'épargne datés (fonds d'urgence, mise de fonds,
  auto, congé) ; où mettre le prochain 1 000 $ (REER, CELI, CELIAPP, REEE
  ou dettes).
- **Plans comparés** : un plan B, copie de votre plan, se modifie dans
  toute l'app sans toucher au vôtre ; comparaison du revenu net, du surplus,
  des dettes et de la valeur nette, liste de ce qui change ; on peut
  l'adopter.
- **Indépendance financière et jalons** : placements visés (25 fois les
  dépenses), année atteinte et âge ; jalons personnels avec la valeur nette
  projetée. **Frais de gestion** : leur coût sur l'horizon.
- **Répartition des placements** : part en actions visée selon le profil
  (prudent, équilibré, croissance), obligations placées d'abord dans le
  REER, puis la société, le CELIAPP et le CELI ; écart avec la part actuelle
  et montant à déplacer.
- **Sous-onglets** : Budget (Ce mois-ci, L'année, Dettes) et Patrimoine
  (Aujourd'hui, Projection, Placements, Proches) montrent une partie à la
  fois ; l'onglet choisi est gardé et un lien peut en viser un
  (« #budget/dettes »).
- **Dossier pour mes proches** : assurances (besoin d'assurance vie
  estimé, part du revenu remplacée en invalidité), testament, mandat,
  documents et personnes-ressources ; une page du rapport PDF.
- **L'année en un coup d'œil** : diagramme de flux, des revenus aux impôts
  et frais, puis aux dépenses, aux dettes, à l'épargne et au surplus.
- **Trésorerie des 12 prochains mois** : votre compte mois par mois, avec
  les paies de la RAMQ, le forfait d'inscription de mai, les forfaits des
  patients vulnérables chaque trimestre, les montants de juin, les
  acomptes provisionnels (ceux du Québec comprennent la prime d'assurance
  médicaments), l'impôt d'avril et les dépenses annuelles ; la
  réserve à garder pour les mois serrés.
- **Reste à dépenser librement** : revenu net moins les dépenses fixes, les
  dépenses annuelles, les dettes et l'épargne, aussi par jour et par
  semaine. **Bilan du mois** : revenu reçu et dépenses réelles comparés au
  budget, avec un rappel mensuel ; au choix, le réel par catégorie et le
  report du non-dépensé (ou du dépassement) d'un mois à l'autre. **Bilan
  de l'année** : reçu et dépensé comparés au budget, part gardée, mois le
  plus cher, valeur nette et écart au plan de référence.
- **Rendement des placements** selon votre profil et vos frais : Normes
  d'hypothèses de projection 2026 (revenu fixe 3,2 % ; actions
  canadiennes, américaines et internationales 6,3 %, 6,4 % et 6,6 %),
  pondérées par la part visée en actions, moins les frais de gestion (RFG).
  Prudent et optimiste : 1,5 point de moins ou de plus. On peut aussi
  inscrire ses propres rendements (bouton Hypothèses).
- **Probabilité de réussite** : 300 simulations où le rendement varie
  chaque année autour de la moyenne arithmétique (rendement du scénario
  + σ²/2, comme le demandent les Normes d'hypothèses de projection 2026) ;
  valeur nette dans 8 cas sur 10 et chances d'atteindre l'indépendance
  financière.
- **Fiche d'une page** (PDF) et **export en tableur** (CSV : résumé,
  budget, dettes, projection) pour un ou une partenaire, un comptable ou
  un conseiller.
- **Sommaire pour le comptable** (PDF d'une page, pages Impôt et Données) :
  revenus et déductions jusqu'au revenu imposable, impôt estimé, acomptes
  et échéances, documents à rassembler selon votre situation (relevés de
  la RAMQ, frais de cabinet, reçus, REER, CELIAPP, garde, frais médicaux,
  feuillets du ou de la partenaire) et points à valider.
- **Dépenses annuelles** : le mois de chaque dépense annuelle, le montant à
  mettre de côté chaque mois et les échéances à venir.

- **Rapport PDF** : 7 pages mises en page (couverture et chiffres clés,
  revenu, impôt, budget, dettes, patrimoine, hypothèses et sources), plus
  le dossier pour les proches s'il est rempli, avec graphiques en
  couleurs ; « Enregistrer en PDF » du navigateur.
- **Lexique des sigles de la RAMQ** : EP 40, EP 42, EP 33, DMÉ, demi-per
  diem, pratique polyvalente, forfait d'inscription, patient vulnérable,
  guichet, taux horaire et mixte… Un toucher sur le mot, souligné en
  pointillé, ouvre sa définition et sa référence ; les montants viennent
  des mêmes constantes que le calcul.
- **Sur téléphone** : le logo et le nom occupent toute la largeur en haut ;
  Rapport PDF (aperçu), thème et Données s'empilent à droite du titre de
  la page. Le bouton **Installer** disparaît une fois l'app installée
  (sur iPhone, Safari ne peut pas le savoir : « Elle est déjà installée »
  le masque) ; la page Données garde de quoi réinstaller. Un champ à 0
  s'efface au toucher : on tape par-dessus.

À l'acte : règles d'avant la Loi 2 (le mode composé n'est pas en vigueur),
avec frais de cabinet (pourcentage de la facturation et montant fixe).

## Tests

```
npm ci                          # ESLint seulement
npx eslint .                    # vérification du code
node tests/calculs.test.js      # calculs
node tests/navigateur.test.js   # parcours dans Chromium (Playwright)
```

- `calculs.test.js` vérifie l'impôt contre l'outil officiel du ministère des
  Finances du Québec, les montants de la RAMQ, les formules hypothécaires, la
  simulation des dettes, la projection et le REEE.
- `navigateur.test.js` ouvre l'app : pages sans débordement sur téléphone,
  montants de la RAMQ selon la colonne, alertes, sauvegarde et restauration,
  démarrage avec un ancien fichier, noms piégés, rapport, avis de nouvelle
  version, politique de sécurité du contenu, sous-onglets, verrou (données
  et sauvegardes chiffrées, mauvaise phrase, phrase changée, délai, retrait),
  sommaire pour le comptable sur une seule page.
- GitHub Actions lance les trois à chaque publication sur `main`
  (`.github/workflows/tests.yml`). Cas fictifs seulement.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page |
| `styles.css` | Mise en page, thèmes clair et sombre |
| `js/calc.js` | Calculs (revenu, impôt 2026, dettes, épargne), sans accès à la page |
| `js/catalogues.js` | Exemple de départ, catalogues (dépenses, autres revenus, dépenses professionnelles), milieux, activités, champs des panneaux « Modifier », cas de vérification |
| `js/interface.js` | Formats, petits composants (rangées, segments, tableaux) et graphique en lignes |
| `js/app.js` | État, calculs du ménage, écrans et événements ; sauvegarde et restauration |
| `js/verrou.js` | Verrou par phrase de passe : chiffrement des données et des sauvegardes |
| `js/rapport.js` | Rapport PDF, fiche d'une page et sommaire pour le comptable |
| `js/demarrage.js` | Thème, écran d'ouverture et écran du verrou, avant l'affichage |
| `tests/` | Tests des calculs et du navigateur |
| `package.json`, `eslint.config.js`, `.github/` | Outils de vérification (rien à installer pour utiliser l'app) |
| `manifest.webmanifest`, `sw.js`, `icone.svg`, `icones/` | Application installable (PWA), hors ligne |
| `polices/` | Inter et Newsreader (SIL Open Font License), hébergées ici |

Aucune étape de construction. Publication : GitHub Pages, branche `main`,
dossier racine.

## Sources des paramètres

- Tarifs de visite : RAMQ, Manuel des médecins omnipraticiens –
  Rémunération à l'acte, onglet B (version Web consultée le 25 octobre
  2026) : colonne « en cabinet » pour la clinique privée et le GMF,
  « en CLSC ou en GMF-U en établissement » pour le CLSC et le GMF-U
  (modifiable). Tarifs modifiables ; « Rétablir les tarifs de la RAMQ ».
- Brochure no 1 de la RAMQ (consultée le 25 octobre 2026), montants en
  vigueur depuis 2018 ou 2019 :
  - Taux horaire (annexe XIV) : 99,48 $ l'heure, à 100 % jusqu'à
    1 540 heures par année (jusqu'à 880 heures de plus si le chef de
    département l'autorise), puis 71,8 % ; la garde sur place au-delà du
    plafond, à 94 %, jusqu'à 528 heures (par. 5.03 et 5.05), au prorata
    des heures de l'année.
  - Mixte en CLSC et en GMF-U (annexe XXIII, sections B-1 et B-2) :
    forfait horaire de 59,68 $, 63,58 % du tarif des services médicaux ;
    intervention de supervision en GMF-U à 24,87 $ par 15 minutes, payée
    à 62,15 %, jusqu'à 3,5 heures par demi-journée.
  - EP 40 : forfait d'inscription (11,85 $ en cabinet, 8,95 $ en
    établissement), forfait annuel d'un patient vulnérable (62,50 $ et
    47 $, jusqu'à 200 % selon les catégories), suppléments à l'inscription
    d'un patient sans médecin de famille (codes 19957 à 19960), montants
    liés au volume de patients (par. 4.15 et 15.01) et majoration de la
    pratique polyvalente (par. 16.00). La majoration temporaire des
    suppléments (par. 18.01) a pris fin le 30 avril 2021 ; la limite de
    150 patients du guichet après 4 ans (ancien par. 13.02) est abolie
    depuis le 1er janvier 2023.
  - EP 40, au taux horaire en établissement : forfait de responsabilité de
    8,25 $ à chaque examen d'un patient vulnérable inscrit (par. 6.02 B,
    code 15169), suppléments de 13,35 $ à l'examen périodique d'un enfant
    de 0 à 5 ans (par. 8.01, code 08877), de 8,95 $ au suivi de grossesse
    (par. 7.02 B, code 15145) et de 35,60 $ une fois par grossesse prise en
    charge au premier trimestre (par. 7.02 A, code 15159 ; nombre inscrit,
    ou suivis de grossesse ÷ 10). À l'acte et au mixte, ils sont compris dans
    le tarif des visites (note du tableau-synthèse des visites). DMÉ : dès
    150 inscrits, ou sans égard au nombre la première année du permis
    (par. 17.01).
  - EP 42 (médecin enseignant) : demi-per diem par résident et par externe,
    en établissement ou en cabinet reconnu, liste 1 ou liste 2.
- Sans rendez-vous : visites ponctuelles mineures (15765, 15766) et
  complexes (15773, 15774), seules facturables sans rendez-vous d'après
  le tableau-synthèse des visites (P.G. 2.2.6 A, 25 juillet 2025).
- Dépenses professionnelles : grille tarifaire 2026-2027 du Collège des
  médecins ; cotisations 2027 de l'ACPM au Québec.
- CELIAPP : 8 000 $ par année, 40 000 $ à vie (Agence du revenu du Canada),
  sur les cotisations versées (à défaut, le solde sert d'estimation).
- Impôt : tables fédérales et québécoises 2026, RRQ et RQAP 2026 (RQAP du
  travailleur autonome : 0,764 % jusqu'à 103 000 $) ; vérifié contre l'outil
  de calcul du revenu disponible du ministère des Finances du Québec (mai
  2026). Fonds des services de santé des particuliers : seuils de 18 500 $
  et 64 355 $ (Paramètres du régime d'imposition des particuliers pour
  l'année d'imposition 2026, novembre 2025).
- Dividendes non déterminés : majoration de 15 %, crédits de 9,0301 %
  (fédéral) et de 3,42 % (Québec) ; au Québec, 2,69 % dès 2027 dans les
  projections (bulletin d'information 2026-3, 29 avril 2026). La déduction
  québécoise pour petite entreprise exige toujours 5 500 heures rémunérées.
- Scénario réaliste : Normes d'hypothèses de projection 2026 de l'Institut
  de planification financière et de FP Canada.
- Hypothèques à taux fixe : intérêt composé deux fois par année (Loi sur
  l'intérêt) ; paiement recalculé au renouvellement sur l'amortissement
  restant.

Estimations seulement : ni avis fiscal, ni avis financier.
