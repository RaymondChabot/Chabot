# Méga-audit de WealthMorand : instructions pour Cursor

À coller en entier dans un seul agent Cursor : dépôt `RaymondChabot/Chabot`,
branche de départ `main`, le modèle le plus fort de la liste.

## 1. Ta mission

Tu fais un audit complet et indépendant de WealthMorand : une application
web statique (PWA) pour les médecins de famille du Québec, en résidence ou en
pratique. Elle calcule le revenu (RAMQ, échelle de la FMRQ), l'impôt, le budget
du ménage, les dettes et le patrimoine, entièrement dans le navigateur ; aucune
donnée ne quitte l'appareil.

Tu livres 11 rapports (volets A à K) et une synthèse priorisée, dans une
seule pull request. Tu ne corriges rien : les corrections viendront ensuite,
lot par lot, une fois les constats validés par la personne qui utilise l'app.

## 2. Règles absolues

1. **Confidentialité.** Aucun nom de personne, aucun courriel réel, aucune
   donnée personnelle, nulle part : rapports, captures, commits, pull request.
   Seules données permises : l'exemple fictif de l'app (`js/catalogues.js`) et
   des cas que tu inventes.
2. **Identité des commits.** Avant le premier commit :
   `git config user.name "WealthMorand"` et
   `git config user.email "wealthmorand@example.invalid"`. Aucune ligne
   `Co-authored-by` qui contient un nom de personne.
3. **Jamais sur `main`.** Branche `cursor/audit-complet`, une seule pull
   request, en brouillon tant que l'audit n'est pas fini. Jamais de
   force-push. Ne fusionne pas la PR : Claude Code la relit et l'intègre.
4. **Rapports seulement.** Ne modifie aucun fichier existant. Ajoute seulement
   des fichiers dans `audits/cursor/` (captures dans
   `audits/cursor/captures/`). Tes scripts de mesure restent hors du dépôt.
5. **Montants officiels.** Tout montant fiscal, de la RAMQ ou de la FMRQ cite
   sa source officielle (lien et date de consultation). N'invente jamais un
   montant : si une source manque, écris-le.
6. **Le dépôt est public.** Décris les failles de sécurité sans code
   d'attaque.
7. **Décisions déjà prises : ne les propose pas comme nouveautés.**
   - Le mode de rémunération composé (Loi 2) n'est pas calculé tant que ses
     montants ne sont pas publiés (entente finale du 13 août 2026).
   - Comptes de synchronisation : Supabase, un seul compte, données chiffrées
     sur l'appareil (conception dans `README.md`, schéma dans
     `supabase/schema.sql`). Le lien de transfert avec code reste offert.
   - Chaque page : un résumé, puis « Voir tout le détail ». Cinq onglets.
   - Identité visuelle : polices Inter et Newsreader hébergées dans
     `polices/`, couleurs de `styles.css`. Pas de « pas à pas ».
   - Résident et externe supervisés : deux tarifs distincts, gardés séparés.
   - Le plan suit le calendrier (il repart du mois courant chaque mois) ;
     l'impôt 2027 utilise des montants provisoires, indexés selon la formule
     officielle, en attendant les montants officiels.
8. **Lis `AGENTS.md` et `README.md` avant de commencer** : architecture,
   conventions et décisions y sont décrites.

## 3. Préparer

1. Installe l'environnement : `bash .cursor/install.sh` (Node 22, `npm ci`,
   Playwright 1.63.0 et Chromium).
2. Note l'état de départ, pour la synthèse : `npx eslint .`,
   `node tests/calculs.test.js`, `node tests/navigateur.test.js`.
3. Lance l'app : `python3 -m http.server 8765`, puis
   `http://localhost:8765/`. Dans un navigateur automatisé, pose
   `localStorage["wm.assistant"] = "1"` et
   `sessionStorage["wm.ouverture"] = "1"` avant le chargement (ni assistant ni
   écran d'ouverture). L'état est `window.Wealthnord.etat()`, les résultats
   `window.Wealthnord.resultats()`.
4. Pour une autre date : `page.clock.setFixedTime(...)` dans Playwright ;
   toute la suite à une autre date : `HORLOGE=2027-03-15 node tests/navigateur.test.js`.
   Quelques scénarios seulement : `SCENARIOS=residence,planCalendrier node tests/navigateur.test.js`.

## 4. Ordre et rythme

Traite les volets dans cet ordre de priorité : **K, A, B, C, F, D, E, H, I,
G, J**. Si tu peux confier des volets à des sous-agents en parallèle, fais-le ;
sinon, un après l'autre.

Après chaque volet, committe son rapport et pousse la branche. Si le temps ou
les crédits manquent, ce qui est fait reste livré : termine alors par la
synthèse de ce qui existe.

## 5. Format de chaque rapport

Un fichier par volet : `audits/cursor/<lettre>-<sujet>.md`, avec :

1. un résumé en 5 lignes ;
2. un tableau des constats : identifiant (`<lettre>-01`, `<lettre>-02`…),
   gravité (critique, élevée, moyenne, faible), fichier et ligne, constat,
   preuve (calcul, capture, source officielle), correction proposée, effort
   (S, M ou L) ;
3. ce qui a été vérifié et trouvé correct (liste courte) ;
4. les questions pour la personne.

Sois concret : un constat sans fichier, sans preuve ou sans correction
proposée ne compte pas.

## 6. Les volets

### K. Relecture des derniers changements (`K-relecture.md`)

Relis les 15 derniers commits de `main` (`git log -15 -p`) : bogues,
régressions, cas oubliés, tests insuffisants, textes ambigus. Regarde de près
les derniers ajouts : résumé et détail de chaque page, le plan qui suit le
calendrier (`avancerPlan` dans `js/app.js`), les paramètres 2027 provisoires
(`P2027` dans `js/calc.js`), la résidence et la première année de pratique.
Pour chaque problème : le commit, le fichier et la ligne, et un scénario qui
le déclenche.

### A. Impôt et cotisations (`A-impot.md`)

Vérifie, contre les sources officielles (ministère des Finances du Québec,
Revenu Québec, Agence du revenu du Canada, Retraite Québec, RQAP,
assurance-emploi), chaque paramètre de `P2026` dans `js/calc.js`, et les
fonctions `impotParticulier`, `impotSalarie`, `impotMixte`,
`cotisationsAutonome`, `fss`, `impotDividendes`, `impotSociete`, `fraisGarde`,
`prestationsFamille`, `primeMedicaments`, `transfertsConjoints` et
`remboursementReer`. Pour chaque paramètre : valeur de l'app, valeur
officielle, lien, date de consultation.

Construis au moins 12 cas (salarié, travailleur autonome, résident, couple,
enfants, frais de garde, dividendes, revenus de 40 000 $ à 400 000 $) et
compare-les à l'outil officiel « Calculer son revenu disponible » du
ministère des Finances du Québec, ou à un calcul à la main détaillé. Donne le
code des cas à ajouter à `tests/calculs.test.js`.

Pour 2027 : vérifie la construction de `P2027` (indexation fédérale de 2,6 %
et québécoise de 3,15 % calculées avec l'indice des prix de Statistique
Canada, règles d'arrondi, assurance-emploi 2027), et liste les montants 2027
déjà publiés officiellement, avec leur source.

### B. Tarifs de la RAMQ et échelle de la FMRQ (`B-ramq.md`)

Vérifie chaque tarif et montant de la RAMQ dans `js/calc.js` (`TARIFS_LIEU`,
`MONTANTS_LIEU`, taux horaire de l'annexe XIV, mixte de l'annexe XXIII,
EP 40, EP 42, forfaits d'inscription et des patients vulnérables,
suppléments, sans rendez-vous, garde, pratique polyvalente, volume,
compensation des frais de cabinet) contre le Manuel des médecins
omnipraticiens (onglet B), la Brochure no 1 et les infolettres de la RAMQ en
vigueur : liens et dates. Vérifie les règles appliquées : plafond de
1 540 heures, garde, apprenants, patients très vulnérables, lieu de pratique.

Vérifie aussi l'échelle de la FMRQ (`FMRQ` et `salaireResident`) et les
primes de garde et d'enseignement. Liste les infolettres de 2026 qui
pourraient changer un montant. Ne calcule pas le mode composé de la Loi 2 :
résume seulement son état, avec sources.

### C. Dettes, épargne et projections (`C-projections.md`)

Vérifie les formules : hypothèque à taux fixe composée deux fois par année,
renouvellements, marge de crédit, prêts étudiants (crédits d'impôt sur les
intérêts), méthodes avalanche, boule de neige et hybride (`simulerDettes`),
REER, CELI, CELIAPP, REEE (subventions de 30 %, plafonds), projection de la
valeur nette (`projeterValeurNette`), rendements selon le profil (Normes
d'hypothèses de projection 2026), simulation de Monte Carlo, indépendance
financière, trésorerie des 12 prochains mois, passage de la résidence à la
pratique, et le plan qui repart du mois courant (soldes prévus, niveau de
résidence au 1er juillet, enfants au 1er janvier, bouton Annuler).

Cherche les cas limites qui cassent : soldes nuls, taux à 0 %, dettes plus
grandes que le revenu, horizon de 40 ans, renouvellement le mois même, plan
resté plusieurs mois sans être ouvert. Refais quelques résultats par un calcul
indépendant (script) et donne les écarts.

### F. Sécurité et confidentialité (`F-securite.md`)

Fais l'analyse de menaces : politique de sécurité du contenu, injection de
HTML (toutes les chaînes HTML et tous les `innerHTML` de `js/`), validation
des données importées (sauvegarde, lien de transfert ; `CHAMPS` dans
`js/catalogues.js`), verrou par phrase de passe (dérivation, chiffrement,
oubli, délai), lien de transfert (code, longueur, intégrité), service worker
(cache, mises à jour), stockage local, affichage dans un cadre par une autre
page, chaîne d'approvisionnement (CI, dépendances).

Relis ensuite la conception des comptes (`README.md`, « Comptes de
synchronisation », et `supabase/schema.sql`) : dérivation du mot de passe,
risques, ce qui manque avant de la coder. Décris les failles sans code
d'attaque.

### D. Parcours et interface (`D-interface.md`)

Parcours l'app avec Playwright à 390 px et à 1280 px, en clair et en sombre :
d'abord l'exemple fictif, puis avec une résidence (page Revenu, détail,
« Ajouter ma résidence »). Pour chaque page (Aperçu, Revenu, Impôt, Budget,
Patrimoine, Données), en résumé et en détail, fais une capture, puis note :
textes peu clairs ou incohérents d'une page à l'autre, chiffres qui ne
concordent pas, alignements, espacements, hiérarchie, éléments superflus,
parcours trop longs (assistant de départ, panneaux « Modifier »). Range les
captures qui prouvent tes constats dans `audits/cursor/captures/`. Propose
des améliorations concrètes, classées par valeur.

### E. Accessibilité (`E-accessibilite.md`)

Évalue l'app selon WCAG 2.2 AA : axe-core sur chaque page (résumé et
détail, clair et sombre), navigation au clavier seulement (ordre, focus
visible, pièges dans les panneaux et l'assistant), noms accessibles, rôles des
graphiques et des segments, annonces (`role="status"`), zoom à 200 %,
mouvement réduit, cibles tactiles. Fais un parcours complet au clavier :
assistant de départ, modifier le revenu, ajouter une dépense, créer un lien
de transfert, activer le verrou. Note chaque blocage avec l'étape exacte.

### H. Tests (`H-tests.md`)

Fais la carte de ce que couvrent `tests/calculs.test.js` et
`tests/navigateur.test.js`, et de ce qu'ils ne couvrent pas : fonctions de
`js/calc.js` sans cas, parcours jamais testés, cas limites, dates (passage
d'une année, horloge fixe). Propose une liste priorisée de tests à ajouter,
avec le code de chaque test dans le rapport (pas dans les fichiers de test).

### I. Performance (`I-performance.md`)

Mesure, avec Playwright et un processeur ralenti 4 fois
(`Emulation.setCPUThrottlingRate`) : démarrage, rendu à chaque changement de
page et à chaque modification d'un champ, coût de chaque fonction `rendre*`
(profilage), mémoire. Explique pourquoi chaque navigation redessine toutes
les pages (`tout()` dans `ouvrir()`, `js/app.js`) et propose une façon de ne
redessiner que la page affichée sans casser les graphiques (largeur des pages
cachées). Donne les chiffres avant et après attendus.

### G. Qualité du code (`G-code.md`)

Évalue la maintenabilité de `js/` (`app.js` compte environ 3 900 lignes) :
fonctions trop longues, duplication, code mort, couplages, noms trompeurs,
commentaires périmés. Propose un plan de découpage d'`app.js` par page (des
fichiers chargés comme les autres, sans outil de construction), étape par
étape, chaque étape vérifiable par les tests existants.

### J. Produit (`J-produit.md`)

Mets-toi à la place de la personne : médecin de famille au Québec, en
résidence puis en début de pratique. Compare WealthMorand à 5 outils
(applications de budget, planification financière pour médecins au Canada,
simulateurs officiels) : ce qu'ils font mieux, ce qui manque ici, ce qui est
en trop. Propose 10 idées classées par valeur pour cette personne et par
effort, sans reproposer les décisions déjà prises (section 2).

## 7. Synthèse (`audits/cursor/synthese.md`)

À la fin, et seulement à partir des rapports :

1. fusionne les doublons ;
2. revérifie dans le code chaque constat critique ou élevé, et écarte ceux
   qui sont faux en disant pourquoi ;
3. classe le reste par gravité et par valeur pour la personne ;
4. propose des **lots de corrections indépendants** : chaque lot touche des
   fichiers différents des autres, pour qu'on puisse les faire en parallèle ;
   donne pour chacun les identifiants des constats, les fichiers touchés, les
   tests à ajouter et l'effort ;
5. mets à part ce qui demande une décision de la personne ;
6. donne l'état de départ des tests (section 3).

## 8. Livrer

- Une seule pull request, « Audit complet Cursor », branche
  `cursor/audit-complet`, qui n'ajoute que `audits/cursor/`.
- Dans sa description : un résumé en 10 lignes, les 10 constats les plus
  graves (identifiant et une phrase chacun), le lien vers `synthese.md`, et
  les volets non terminés s'il y en a.
- Ne fusionne pas la PR.

## 9. Ensuite (pas maintenant)

Les corrections se feront lot par lot, chacune dans sa branche et sa pull
request, avec un test pour chaque constat corrigé, quand la personne aura
choisi les lots.
