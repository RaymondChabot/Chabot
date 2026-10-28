# Règles pour les agents (Cursor et autres)

WealthMorand est une application web statique (PWA) pour les médecins de
famille du Québec, en résidence ou en pratique : revenu (RAMQ, échelle de la
FMRQ), impôt, budget du ménage, dettes, patrimoine. Tout est calculé dans le
navigateur ; aucune donnée ne quitte l'appareil. Interface en français
(Canada), ton direct, vouvoiement, mots neutres (« votre partenaire »).

Lisez ce fichier en entier avant de commencer. Il passe avant vos habitudes.

## Règles absolues

1. **Confidentialité.** N'écrivez aucun nom de personne, aucun courriel réel,
   aucune donnée personnelle : ni dans le code, ni dans les commits, ni dans
   les pull requests, ni dans les rapports. Les seules données permises sont
   l'exemple fictif de l'app (`js/catalogues.js`) et des cas inventés dans les
   tests. Ne créez jamais de fichier `*donnees*.json` ou `*.backup.json`.
2. **Identité des commits.** Avant le premier commit :
   `git config user.name "WealthMorand"` et
   `git config user.email "wealthmorand@example.invalid"`. N'ajoutez aucune
   ligne `Co-authored-by` qui contient un nom de personne.
3. **Jamais sur `main`.** Une branche par sujet (`cursor/<sujet>`), une pull
   request par sujet, en brouillon si elle n'est pas prête. Jamais de
   force-push, jamais de réécriture d'historique. Claude Code relit et intègre.
4. **Aucune ressource externe.** La page ne charge rien d'ailleurs (politique
   de sécurité du contenu dans `index.html`) : pas de police, script, image ou
   appel réseau externe. Pas de nouvelle dépendance d'exécution ; pas de
   cadriciel. Une dépendance de développement seulement si la PR l'explique.
5. **Ne touchez pas, sauf demande explicite :** la version du cache dans
   `sw.js` (l'intégrateur la monte à la publication), `supabase/schema.sql`,
   `docs/comptes-claude-chrome.md`, le logo et les icônes.
6. **Montants officiels.** Tout montant fiscal, de la RAMQ ou de la FMRQ cite
   sa source officielle (lien et date de consultation). N'inventez jamais un
   montant : si une source manque, écrivez-le.
7. **Tests.** Avant toute PR de code : `npx eslint .`,
   `node tests/calculs.test.js` et `node tests/navigateur.test.js` passent.
   Chaque correction ajoute ou ajuste un test qui aurait échoué avant.
   Tests ciblés : `SCENARIOS=residence,transfert node tests/navigateur.test.js`.
8. **Décisions déjà prises : ne pas les reproposer comme nouveautés.**
   - Le mode de rémunération composé (Loi 2) n'est pas calculé tant que ses
     montants ne sont pas publiés (entente finale du 13 août 2026).
   - Comptes : Supabase, un seul compte (celui de la personne), données
     chiffrées sur l'appareil, conception décrite dans `README.md`. Le lien de
     transfert avec code reste offert.
   - Chaque page : un résumé, puis « Voir tout le détail ». Cinq onglets.
   - Identité visuelle : polices Inter et Newsreader hébergées dans
     `polices/`, couleurs de `styles.css`. Pas de « pas à pas ».
   - Résident et externe supervisés : deux tarifs distincts, gardés séparés.

## Architecture

| Fichier | Rôle |
|---|---|
| `js/calc.js` | Moteur de calcul pur (`window.Calc`, aussi chargé par Node) : `P2026` (paramètres fiscaux), tarifs de la RAMQ (`TARIFS_LIEU`, `MONTANTS_LIEU`), `impotParticulier`, `impotSalarie`, `impotMixte`, `FMRQ` et `salaireResident`, `simulerDettes`, `projeterValeurNette`, `projeterReee`, `fraisGarde`, `prestationsFamille`. |
| `js/catalogues.js` | État de départ (exemple fictif), schéma `CHAMPS` (validation et migration des données importées), panneaux « Modifier » (`FEUILLES`), lexique des sigles. |
| `js/app.js` | Calcul des résultats (`calculer()` → `R`), rendu des pages (`rendre*`, résumés `resume*`), navigation (`ouvrir()`, routes `#page` et `#page/detail`), « À faire », échéances, trésorerie, assistant de départ, lien de transfert. |
| `js/interface.js` | Petits outils d'interface : `el()`, `rangees()`, graphiques SVG, lexique. |
| `js/verrou.js` | Verrou par phrase de passe (PBKDF2 600 000 itérations, AES-GCM), sauvegardes chiffrées, lien de transfert. |
| `js/rapport.js` | Rapport PDF, fiche d'une page, sommaire pour le comptable. |
| `index.html`, `styles.css` | Pages (`#v-apercu` à `#v-donnees`) ; classes `resume-seul` et `detail-seul`. |
| `sw.js`, `manifest.webmanifest` | Application installable, hors ligne. |
| `tests/` | `calculs.test.js` (comparé à l'outil officiel du ministère des Finances), `navigateur.test.js` (parcours dans Chromium, Playwright). |

Lancer l'app : `python3 -m http.server 8765`, puis `http://localhost:8765/`.
L'état est `window.Wealthnord.etat()`, les résultats
`window.Wealthnord.resultats()`. Dans un navigateur automatisé, posez
`localStorage["wm.assistant"] = "1"` et `sessionStorage["wm.ouverture"] = "1"`
avant le chargement pour sauter l'assistant et l'écran d'ouverture.

## Conventions

- Code en français (noms, commentaires), dans le style du fichier touché :
  même densité de commentaires, mêmes petites fonctions, pas de classes.
- Tout texte affiché passe par `textContent` ou `el()` ; une chaîne HTML
  n'accepte que des valeurs échappées.
- Montants : les formateurs `$`, `$2`, `nb`, `pct` ; espaces insécables comme
  ailleurs dans l'app.
- Accessibilité : WCAG 2.2 AA, cibles de 44 px, focus visible, thème sombre.
- Téléphone d'abord (390 px), sans défilement horizontal à 320 px.

## Rapports d'audit

Un audit ne modifie pas le code. Il ajoute un seul fichier,
`audits/cursor/<sujet>.md`, dans sa propre PR, avec :

1. un résumé de 5 lignes ;
2. un tableau des constats : identifiant (`<lettre>-01`…), gravité
   (critique, élevée, moyenne, faible), fichier et ligne, constat, preuve
   (calcul, capture, source officielle), correction proposée, effort ;
3. ce qui a été vérifié et trouvé correct ;
4. les questions pour la personne.

Une faille de sécurité se décrit sans code d'attaque : le dépôt est public.
