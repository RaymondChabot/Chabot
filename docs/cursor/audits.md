# Audits et corrections avec Cursor

Cursor apporte un second regard indépendant sur WealthMorand. Ses agents dans le
nuage lisent les règles du dépôt (`AGENTS.md` et `.cursor/rules/`), travaillent
chacun sur sa branche et ouvrent des pull requests. Claude Code relit chaque PR
avant de l'intégrer : rien ne va directement sur `main`.

## Préparer (une fois)

1. Dans Cursor, connectez GitHub et donnez accès au dépôt (lecture et écriture).
   Les agents dans le nuage demandent un forfait qui les inclut ; Cursor vous fait
   choisir une limite de dépense au premier lancement.
2. Ouvrez cursor.com/agents. L'environnement se prépare tout seul avec
   `.cursor/environment.json` : Node 22, outils du dépôt, Chromium pour les tests.
   Si Cursor propose plutôt une préparation guidée, acceptez-la.
3. Pour chaque agent : dépôt `RaymondChabot/Chabot`, branche de départ `main`, le
   modèle le plus fort de la liste.

## Phase 1 : audits, en parallèle

Lancez un agent par audit, tous en même temps : ils n'écrivent qu'un rapport
chacun, donc aucun conflit. Chaque audit ouvre une PR avec un fichier
`audits/cursor/<lettre>-<sujet>.md`.

### A. Impôt et cotisations 2026

```text
Audit A de WealthMorand : impôt et cotisations 2026. Rapport seulement : ne modifie aucun fichier de code. Lis d'abord AGENTS.md à la racine et respecte-le (confidentialité, identité des commits, jamais sur main). Livre une seule pull request, branche cursor/audit-impot, qui ajoute audits/cursor/A-impot.md au format d'AGENTS.md (constats A-01, A-02…). Sois concret : fichier et ligne, preuve, correction proposée, effort. Garde courte la liste de ce qui est correct. Si le temps manque, livre ce que tu as.

Vérifie, contre les sources officielles (ministère des Finances du Québec, Revenu Québec, Agence du revenu du Canada, Retraite Québec, RQAP, assurance-emploi), chaque paramètre de P2026 dans js/calc.js, et les fonctions impotParticulier, impotSalarie, impotMixte, cotisationsAutonome, fss, impotDividendes, impotSociete, fraisGarde, prestationsFamille, primeMedicaments, transfertsConjoints et remboursementReer. Pour chaque paramètre : valeur de l'app, valeur officielle, lien, date de consultation.

Construis au moins 12 cas (salarié, travailleur autonome, résident, couple, enfants, frais de garde, dividendes, revenus de 40 000 $ à 400 000 $) et compare-les à l'outil officiel « Calculer son revenu disponible » du ministère des Finances du Québec, ou à un calcul à la main détaillé. Donne le code des cas à ajouter à tests/calculs.test.js. Liste aussi les montants 2027 déjà annoncés officiellement, avec leur source.
```

### B. Tarifs de la RAMQ et échelle de la FMRQ

```text
Audit B de WealthMorand : tarifs de la RAMQ et échelle de la FMRQ. Rapport seulement : ne modifie aucun fichier de code. Lis d'abord AGENTS.md à la racine et respecte-le (confidentialité, identité des commits, jamais sur main). Livre une seule pull request, branche cursor/audit-ramq, qui ajoute audits/cursor/B-ramq.md au format d'AGENTS.md (constats B-01, B-02…). Sois concret : fichier et ligne, preuve, correction proposée, effort. Garde courte la liste de ce qui est correct. Si le temps manque, livre ce que tu as.

Vérifie chaque tarif et montant de la RAMQ dans js/calc.js (TARIFS_LIEU, MONTANTS_LIEU, taux horaire de l'annexe XIV, mixte de l'annexe XXIII, EP 40, EP 42, forfaits d'inscription et des patients vulnérables, suppléments, sans rendez-vous, garde, pratique polyvalente, volume, compensation des frais de cabinet) contre le Manuel des médecins omnipraticiens (onglet B), la Brochure no 1 et les infolettres de la RAMQ en vigueur : liens et dates. Vérifie les règles appliquées : plafond de 1 540 heures, garde, apprenants, patients très vulnérables, lieu de pratique.

Vérifie aussi l'échelle de la FMRQ (FMRQ et salaireResident dans js/calc.js) et les primes de garde et d'enseignement. Liste les infolettres de 2026 qui pourraient changer un montant. Ne calcule pas le mode composé de la Loi 2 : résume seulement son état, avec sources.
```

### C. Dettes, épargne et projections

```text
Audit C de WealthMorand : dettes, épargne et projections. Rapport seulement : ne modifie aucun fichier de code. Lis d'abord AGENTS.md à la racine et respecte-le (confidentialité, identité des commits, jamais sur main). Livre une seule pull request, branche cursor/audit-projections, qui ajoute audits/cursor/C-projections.md au format d'AGENTS.md (constats C-01, C-02…). Sois concret : fichier et ligne, preuve, correction proposée, effort. Garde courte la liste de ce qui est correct. Si le temps manque, livre ce que tu as.

Vérifie les formules : hypothèque à taux fixe composée deux fois par année, renouvellements, marge de crédit, prêts étudiants (crédits d'impôt sur les intérêts), méthodes avalanche, boule de neige et hybride (simulerDettes), REER (droits, remboursement), CELI, CELIAPP, REEE (subventions de 30 %, plafonds), projection de la valeur nette (projeterValeurNette), rendements selon le profil (Normes d'hypothèses de projection 2026), simulation de Monte Carlo, indépendance financière, trésorerie des 12 prochains mois, passage de la résidence à la pratique.

Cherche les cas limites qui cassent : soldes nuls, taux à 0 %, dettes plus grandes que le revenu, horizon de 40 ans, renouvellement le mois même. Refais quelques résultats par un calcul indépendant (script) et donne les écarts.
```

### D. Parcours et interface

```text
Audit D de WealthMorand : parcours et interface. Rapport seulement : ne modifie aucun fichier de code. Lis d'abord AGENTS.md à la racine et respecte-le (confidentialité, identité des commits, jamais sur main). Livre une seule pull request, branche cursor/audit-interface, qui ajoute audits/cursor/D-interface.md au format d'AGENTS.md (constats D-01, D-02…). Sois concret : fichier et ligne, preuve, correction proposée, effort. Garde courte la liste de ce qui est correct. Si le temps manque, livre ce que tu as.

Lance l'app (python3 -m http.server 8765) et parcours-la avec Playwright à 390 px et à 1280 px, en clair et en sombre : d'abord l'exemple fictif, puis avec une résidence (page Revenu, détail, « Ajouter ma résidence »). Pour chaque page (Aperçu, Revenu, Impôt, Budget, Patrimoine, Données), en résumé et en détail, fais une capture, puis note : textes peu clairs ou incohérents d'une page à l'autre, chiffres qui ne concordent pas, alignements, espacements, hiérarchie, éléments superflus, parcours trop longs (assistant de départ, panneaux « Modifier »).

Joins à la PR les captures qui prouvent tes constats. Propose des améliorations concrètes, classées par valeur.
```

### E. Accessibilité

```text
Audit E de WealthMorand : accessibilité. Rapport seulement : ne modifie aucun fichier de code. Lis d'abord AGENTS.md à la racine et respecte-le (confidentialité, identité des commits, jamais sur main). Livre une seule pull request, branche cursor/audit-accessibilite, qui ajoute audits/cursor/E-accessibilite.md au format d'AGENTS.md (constats E-01, E-02…). Sois concret : fichier et ligne, preuve, correction proposée, effort. Garde courte la liste de ce qui est correct. Si le temps manque, livre ce que tu as.

Évalue l'app selon WCAG 2.2 AA : axe-core sur chaque page (résumé et détail, clair et sombre), navigation au clavier seulement (ordre, focus visible, pièges dans les panneaux et dans l'assistant), noms accessibles, rôles des graphiques et des segments, annonces (role="status"), zoom à 200 %, mouvement réduit, cibles tactiles.

Fais un parcours complet au clavier : assistant de départ, modifier le revenu, ajouter une dépense, créer un lien de transfert, activer le verrou. Note chaque blocage avec l'étape exacte.
```

### F. Sécurité et confidentialité

```text
Audit F de WealthMorand : sécurité et confidentialité. Rapport seulement : ne modifie aucun fichier de code. Lis d'abord AGENTS.md à la racine et respecte-le (confidentialité, identité des commits, jamais sur main). Livre une seule pull request, branche cursor/audit-securite, qui ajoute audits/cursor/F-securite.md au format d'AGENTS.md (constats F-01, F-02…). Sois concret : fichier et ligne, preuve, correction proposée, effort. Garde courte la liste de ce qui est correct. Si le temps manque, livre ce que tu as.

Fais l'analyse de menaces de l'app : politique de sécurité du contenu, injection de HTML (toutes les chaînes HTML et tous les innerHTML de js/), validation des données importées (sauvegarde, lien de transfert ; CHAMPS dans js/catalogues.js), verrou (dérivation, chiffrement, oubli, délai), lien de transfert (code, longueur, intégrité), service worker (cache, mises à jour), stockage local, affichage dans un cadre par une autre page, chaîne d'approvisionnement (CI, dépendances).

Relis ensuite la conception des comptes (README.md, « Comptes de synchronisation », et supabase/schema.sql) : dérivation du mot de passe, risques, ce qui manque avant de la coder. Décris les failles sans code d'attaque : le dépôt est public.
```

### G. Qualité du code

```text
Audit G de WealthMorand : qualité du code. Rapport seulement : ne modifie aucun fichier de code. Lis d'abord AGENTS.md à la racine et respecte-le (confidentialité, identité des commits, jamais sur main). Livre une seule pull request, branche cursor/audit-code, qui ajoute audits/cursor/G-code.md au format d'AGENTS.md (constats G-01, G-02…). Sois concret : fichier et ligne, preuve, correction proposée, effort. Garde courte la liste de ce qui est correct. Si le temps manque, livre ce que tu as.

Évalue la maintenabilité de js/ (app.js compte environ 3 850 lignes) : fonctions trop longues, duplication, code mort, couplages, noms trompeurs, commentaires périmés.

Propose un plan de découpage d'app.js par page (des fichiers chargés comme les autres, sans outil de construction), étape par étape, chaque étape vérifiable par les tests existants. Aucune modification de code dans cette PR.
```

### H. Tests

```text
Audit H de WealthMorand : tests. Rapport seulement : ne modifie aucun fichier de code. Lis d'abord AGENTS.md à la racine et respecte-le (confidentialité, identité des commits, jamais sur main). Livre une seule pull request, branche cursor/audit-tests, qui ajoute audits/cursor/H-tests.md au format d'AGENTS.md (constats H-01, H-02…). Sois concret : fichier et ligne, preuve, correction proposée, effort. Garde courte la liste de ce qui est correct. Si le temps manque, livre ce que tu as.

Fais la carte de ce que les tests couvrent (tests/calculs.test.js, tests/navigateur.test.js) et de ce qu'ils ne couvrent pas : fonctions de js/calc.js sans cas, parcours de l'interface jamais testés, cas limites, dates (passage d'une année, horloge fixe avec p.clock.setFixedTime).

Propose une liste priorisée de tests à ajouter, avec le code de chaque test dans le rapport (pas dans les fichiers de test).
```

### I. Performance

```text
Audit I de WealthMorand : performance. Rapport seulement : ne modifie aucun fichier de code. Lis d'abord AGENTS.md à la racine et respecte-le (confidentialité, identité des commits, jamais sur main). Livre une seule pull request, branche cursor/audit-performance, qui ajoute audits/cursor/I-performance.md au format d'AGENTS.md (constats I-01, I-02…). Sois concret : fichier et ligne, preuve, correction proposée, effort. Garde courte la liste de ce qui est correct. Si le temps manque, livre ce que tu as.

Mesure, avec Playwright et un processeur ralenti 4 fois (Emulation.setCPUThrottlingRate) : temps de démarrage, temps de rendu à chaque changement de page et à chaque modification d'un champ, coût de chaque fonction rendre* (profilage), mémoire.

Explique pourquoi chaque navigation redessine toutes les pages (tout() dans ouvrir(), js/app.js) et propose une façon de ne redessiner que la page affichée sans casser les graphiques (largeur des pages cachées). Donne les chiffres avant et après attendus.
```

### J. Produit

```text
Audit J de WealthMorand : produit. Rapport seulement : ne modifie aucun fichier de code. Lis d'abord AGENTS.md à la racine et respecte-le (confidentialité, identité des commits, jamais sur main). Livre une seule pull request, branche cursor/audit-produit, qui ajoute audits/cursor/J-produit.md au format d'AGENTS.md (constats J-01, J-02…). Sois concret : fichier et ligne, preuve, correction proposée, effort. Garde courte la liste de ce qui est correct. Si le temps manque, livre ce que tu as.

Mets-toi à la place de la personne : médecin de famille au Québec, en résidence puis en début de pratique. Compare WealthMorand à 5 outils (applications de budget, planification financière pour médecins au Canada, simulateurs officiels) : ce qu'ils font mieux, ce qui manque ici, ce qui est en trop.

Propose 10 idées classées par valeur pour cette personne et par effort, sans reproposer les décisions déjà prises (AGENTS.md, section 8).
```

### K. Relecture des derniers changements

```text
Audit K de WealthMorand : relecture des derniers changements. Rapport seulement : ne modifie aucun fichier de code. Lis d'abord AGENTS.md à la racine et respecte-le (confidentialité, identité des commits, jamais sur main). Livre une seule pull request, branche cursor/audit-relecture, qui ajoute audits/cursor/K-relecture.md au format d'AGENTS.md (constats K-01, K-02…). Sois concret : fichier et ligne, preuve, correction proposée, effort. Garde courte la liste de ce qui est correct. Si le temps manque, livre ce que tu as.

Relis les 15 derniers commits de main (git log -15 -p) : bogues, régressions, cas oubliés, tests insuffisants, textes ambigus. Pour chaque problème, montre le commit, le fichier et la ligne, et un scénario qui le déclenche.
```

## Phase 2 : synthèse

Quand les audits sont terminés, lancez un agent avec ceci :

```text
Synthèse des audits Cursor de WealthMorand. Lis d'abord AGENTS.md et respecte-le. Lis tous les rapports audits/cursor/*.md des pull requests d'audit (branches cursor/audit-*). Fusionne les doublons ; vérifie dans le code les constats douteux et écarte ceux qui sont faux (dis pourquoi) ; classe le reste par gravité et par valeur pour la personne.

Livre audits/cursor/synthese.md dans une seule PR (branche cursor/audit-synthese) : une liste priorisée de lots de corrections. Chaque lot touche des fichiers différents des autres, pour qu'on puisse les faire en parallèle ; il donne les identifiants des constats, les fichiers touchés, les tests à ajouter et l'effort. Mets à part ce qui demande une décision de la personne.
```

Puis dites à Claude Code que la synthèse est prête : nous choisissons ensemble les
lots à faire.

## Phase 3 : corrections, en parallèle

Un agent par lot retenu, avec ce modèle (remplacez les mots entre < >) :

```text
Correction de WealthMorand : lot <numéro> de audits/cursor/synthese.md (constats <identifiants>). Lis d'abord AGENTS.md et respecte-le. Branche cursor/<sujet>, une seule pull request.

Corrige seulement ces constats, dans le style du code existant. Ajoute pour chacun un test qui échouait avant. Lance npx eslint ., node tests/calculs.test.js et node tests/navigateur.test.js : tout doit passer. Ne touche pas à la version du cache dans sw.js.

Dans la PR : ce qui change, pourquoi, comment c'est testé, et des captures avant et après si l'interface change.
```

Quand des PR de correction sont prêtes, dites-le à Claude Code : il vérifie
qu'aucun nom n'y figure, relance les tests, intègre ou demande des changements.
