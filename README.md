# Wealthnord

Votre boussole financière.

Application web statique pour estimer le revenu d'un médecin en GMF-U
(taux horaire, mode mixte ou à l'acte), l'impôt, le budget du ménage, le
remboursement des dettes et la valeur nette.

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

Pour tout médecin de famille en GMF-U au Québec : seul ou en couple,
travail autonome ou pratique incorporée.

- **Revenu GMF-U** : taux horaire, mode mixte ou à l'acte, selon les
  demi-journées, les patients, la supervision et la prise en charge de
  nouveaux patients.
- **Impôt 2026** : fédéral et Québec, RRQ, RQAP, Fonds des services de
  santé ; société et dividendes ; partenaire salarié ou à son compte et
  transferts de crédits ; allocations
  familiales, prime d'assurance médicaments, REER, société.
- **Budget et dettes** : une case par dépense récurrente ; avalanche,
  hybride ou boule de neige ; hypothèques à intérêt composé deux fois par
  année, paiement recalculé au renouvellement, droit annuel de
  remboursement anticipé.
- **Avenir** : scénarios prudent, réaliste et optimiste ; chaque année en
  dollars de l'année (paliers d'impôt indexés, enfants qui vieillissent) ;
  équité de la maison, autos, placements, valeur nette sur 10 à 30 ans.

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
| `js/calc.js` | Calculs (revenu GMF-U, impôt 2026, dettes, épargne), sans accès à la page |
| `js/app.js` | Interface, sauvegarde locale, import et export |
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
- Forfaits et suppléments d'inscription : EP 40.
- Impôt : tables fédérales et québécoises 2026, RRQ et RQAP 2026 ; vérifié
  contre l'outil de calcul du revenu disponible du ministère des Finances
  du Québec (mai 2026).
- Scénario réaliste : Normes d'hypothèses de projection 2026 de l'Institut
  de planification financière et de FP Canada.
- Hypothèques à taux fixe : intérêt composé deux fois par année (Loi sur
  l'intérêt) ; paiement recalculé au renouvellement sur l'amortissement
  restant.

Estimations seulement : ni avis fiscal, ni avis financier.
