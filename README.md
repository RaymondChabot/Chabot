# WealthMorand

Votre boussole financière.

Application web statique pour les médecins de famille en début de
pratique : revenu, impôt, budget du ménage, remboursement des dettes et
valeur nette.

## Confidentialité

- Le code ne contient **aucune donnée personnelle**. Les valeurs affichées
  au premier lancement sont un exemple fictif.
- Les données saisies ou importées restent dans le navigateur
  (`localStorage`). La page ne charge aucune ressource externe et n'envoie
  rien à un serveur.
- Le bouton **Exporter** crée une copie de sauvegarde ; **Importer** la
  recharge sur un autre appareil.
- Ne versez jamais un fichier de données dans ce dépôt : `.gitignore`
  bloque les fichiers `*donnees*.json`.

## Ce qu'elle calcule

Pour tout médecin de famille au Québec, dans tous les milieux : seul ou
en couple (mariés ou conjoints de fait), avec ou sans enfants,
propriétaire ou locataire, travail autonome ou pratique incorporée.

Au premier lancement, un **assistant de départ** pose quelques questions
(famille, enfants, pratique, logement, dettes) et bâtit le point de départ
à partir des réponses ; l'exemple fictif reste offert. Il propose ensuite
deux **parcours pas à pas**, facultatifs : les revenus (pratique, semaine,
apprenants, clientèle, frais de cabinet, activités, autres revenus,
dépenses professionnelles) et le budget (une catégorie par écran). Chaque
écran explique quoi inscrire et se passe. La carte **Votre portrait** de
l'aperçu montre ce qui est rempli et propose la suite. Des conjoints de
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
  supervision facturée à l'acte de supervision ou aux visites des
  apprenants. Tous les tarifs, forfaits et suppléments se modifient ;
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
- **Dépenses annuelles** : le mois de chaque dépense annuelle, le montant à
  mettre de côté chaque mois et les échéances à venir.

- **Rapport PDF** : 7 pages mises en page (couverture et chiffres clés,
  revenu, impôt, budget, dettes, avenir, hypothèses et sources), avec
  graphiques en couleurs ; « Enregistrer en PDF » du navigateur.

À l'acte : règles d'avant la Loi 2 (le mode composé n'est pas en vigueur),
avec frais de cabinet (pourcentage de la facturation et montant fixe).

## Tests

```
node tests/calculs.test.js
```

Vérifie l'impôt contre l'outil officiel du ministère des Finances du Québec,
les formules hypothécaires, la simulation des dettes, la projection et le
REEE. Cas fictifs seulement.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page |
| `styles.css` | Mise en page, thèmes clair et sombre |
| `js/calc.js` | Calculs (revenu, impôt 2026, dettes, épargne), sans accès à la page |
| `js/app.js` | Interface, sauvegarde locale, import et export |
| `js/rapport.js` | Rapport PDF mis en page |
| `tests/calculs.test.js` | Tests des calculs (Node, sans dépendance) |
| `manifest.webmanifest`, `sw.js`, `icone.svg`, `icones/` | Application installable (PWA), hors ligne |
| `polices/` | Inter et Newsreader (SIL Open Font License), hébergées ici |

Aucune étape de construction. Publication : GitHub Pages, branche `main`,
dossier racine.

## Sources des paramètres

- Tarifs de visite : RAMQ, tableaux de l'onglet B (août 2026), colonne
  CLSC / GMF-U.
- Tarif horaire, mode mixte et supervision : EP 42 et annexe XXIII ; les
  montants par défaut sont les derniers publiés trouvés et doivent être
  confirmés.
- Forfaits et suppléments d'inscription : EP 40. Supplément des patients
  très vulnérables (code 19960) : à confirmer selon le montant en vigueur.
- Sans rendez-vous : visites ponctuelles mineures (15765 à 15772) et
  complexes (15773 à 15780) ; tarifs de départ estimés d'après leur rapport
  au tarif du suivi au cabinet (environ 48 % et 95 %), à vérifier.
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
