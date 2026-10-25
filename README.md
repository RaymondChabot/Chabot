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
  de nouveaux patients, patients vulnérables et très vulnérables. En GMF-U :
  résidents (4 à 5 patients par demi-journée) et externes (2 à 3),
  demi-per diem selon le lieu et la région ; au mixte, intervention de
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
- **Dossier pour mes proches** : assurances (besoin d'assurance vie
  estimé, part du revenu remplacée en invalidité), testament, mandat,
  documents et personnes-ressources ; une page du rapport PDF.
- **L'année en un coup d'œil** : diagramme de flux, des revenus aux impôts
  et frais, puis aux dépenses, aux dettes, à l'épargne et au surplus.
- **Reste à dépenser librement** : revenu net moins les dépenses fixes, les
  dépenses annuelles, les dettes et l'épargne. **Bilan du mois** : revenu
  reçu et dépenses réelles comparés au budget, avec un rappel mensuel.
- **Probabilité de réussite** : 300 simulations où le rendement varie
  chaque année ; valeur nette dans 8 cas sur 10 et chances d'atteindre
  l'indépendance financière.
- **Fiche d'une page** (PDF) et **export en tableur** (CSV : résumé,
  budget, dettes, projection) pour un ou une partenaire, un comptable ou
  un conseiller.
- **Dépenses annuelles** : le mois de chaque dépense annuelle, le montant à
  mettre de côté chaque mois et les échéances à venir.

- **Rapport PDF** : 7 pages mises en page (couverture et chiffres clés,
  revenu, impôt, budget, dettes, patrimoine, hypothèses et sources), plus
  le dossier pour les proches s'il est rempli, avec graphiques en
  couleurs ; « Enregistrer en PDF » du navigateur.

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
  version, politique de sécurité du contenu.
- GitHub Actions lance les trois à chaque publication sur `main`
  (`.github/workflows/tests.yml`). Cas fictifs seulement.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page |
| `styles.css` | Mise en page, thèmes clair et sombre |
| `js/calc.js` | Calculs (revenu, impôt 2026, dettes, épargne), sans accès à la page |
| `js/app.js` | Interface, sauvegarde locale, sauvegarde et restauration |
| `js/rapport.js` | Rapport PDF mis en page |
| `js/demarrage.js` | Thème et écran d'ouverture, avant l'affichage |
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
    département l'autorise), puis 71,8 %.
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
  - EP 42 (médecin enseignant) : demi-per diem par résident et par externe,
    en établissement ou en cabinet reconnu, liste 1 ou liste 2.
- Sans rendez-vous : visites ponctuelles mineures (15765, 15766) et
  complexes (15773, 15774), seules facturables sans rendez-vous d'après
  le tableau-synthèse des visites (P.G. 2.2.6 A, 25 juillet 2025).
- Dépenses professionnelles : grille tarifaire 2026-2027 du Collège des
  médecins ; cotisations 2027 de l'ACPM au Québec.
- CELIAPP : 8 000 $ par année, 40 000 $ à vie (Agence du revenu du Canada).
- Impôt : tables fédérales et québécoises 2026, RRQ et RQAP 2026 ; vérifié
  contre l'outil de calcul du revenu disponible du ministère des Finances
  du Québec (mai 2026).
- Scénario réaliste : Normes d'hypothèses de projection 2026 de l'Institut
  de planification financière et de FP Canada.
- Hypothèques à taux fixe : intérêt composé deux fois par année (Loi sur
  l'intérêt) ; paiement recalculé au renouvellement sur l'amortissement
  restant.

Estimations seulement : ni avis fiscal, ni avis financier.
