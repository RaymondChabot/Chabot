# Audit F — Sécurité et confidentialité

WealthMorand chiffre les données au repos (AES-GCM 256 bits, clé tirée par PBKDF2-SHA-256, 600 000 itérations, sel et vecteur au hasard) et le lien de transfert (code de 80 bits, fragment d'URL, en-tête authentifié). La politique de contenu bloque les scripts intégrés et toute connexion vers un autre site.

L'écart le plus sérieux est l'import : fichier ou lien, presque aucun schéma n'est appliqué. Une projection de REEE sans plafond peut alors ne plus se terminer, après que les données de l'appareil ont déjà été remplacées ; l'écran principal reste masqué.

Deux graphiques insèrent du texte libre dans du HTML sans l'échapper. La politique empêche l'exécution d'un script et l'envoi des données ailleurs ; l'effet réaliste est un affichage falsifié. Le rapport PDF, lui, échappe les noms et le dossier pour les proches.

Une balise `meta` ne peut pas porter `frame-ancestors`, et le dépôt n'envoie aucun en-tête : une autre page peut afficher WealthMorand dans un cadre. Les comptes ne sont pas codés : la dérivation double, le refus d'écraser le seul coffre, et un historique manquent encore. Le lien de transfert reste à offrir.

## Constats

| ID | Gravité | Fichier et ligne | Constat | Preuve | Correction proposée | Effort |
|---|---|---|---|---|---|---|
| F-01 | moyenne | `index.html:6` | La politique est dans une balise `meta`. `frame-ancestors` y est ignoré par les navigateurs. Aucun fichier d'en-têtes dans le dépôt. | Directive citée plus bas. `object-src`, `base-uri` et `form-action` sont présents et stricts. | En-tête HTTP `Content-Security-Policy` avec `frame-ancestors 'none'`, en plus de la balise. Si l'hôte ne peut pas envoyer d'en-tête, le noter comme risque accepté. | M |
| F-02 | moyenne | `js/interface.js:172`, `js/app.js:2402`, `js/app.js:2509` | Deux constructions HTML reçoivent du texte libre sans échappement. La politique empêche le script et l'exfiltration. | Nom de plan dans `aria-label` ; clés de `budgetTotaux` dans le diagramme de flux. Le rapport échappe les textes. | Même échappement que `esc` de `js/rapport.js`, ou nœuds créés par `createElement` / `textContent`. | S |
| F-03 | élevée | `js/app.js:24`, `js/app.js:3326`, `js/calc.js:818` | L'import ne valide pas le schéma. Un âge d'enfant hors de toute borne fait une boucle qui ne se termine pas. L'état est enregistré avant le calcul, et l'écran reste masqué. | `fusion` recopie les clés inconnues ; `restaurer` ne teste que trois conditions ; `projeterReee` boucle sur `17 - âge`. | Schéma (types, bornes, tailles), rejet de `__proto__` et `constructor`, calcul réussi avant l'écriture, message et sortie si le calcul échoue. | M |
| F-04 | moyenne | `js/app.js:3345` | Restaurer un fichier remplace les données tout de suite. Le lien, lui, demande une confirmation. | `restaurer(d)` dans le lecteur de fichier ; `confirmerTransfert` pour le lien. | Le même résumé (date, dettes, dépenses) et un bouton explicite avant d'écrire. | S |
| F-05 | faible | `js/verrou.js:26` | Les en-têtes du coffre (version, méthode) ne sont pas couverts par l'authentification du chiffrement, et `version` n'est pas lue. | `chiffrer` et `ouvrirEnveloppe`. Sel, vecteur et nombre d'itérations faux : le déchiffrement échoue. | Pour les nouvelles enveloppes, lier ces en-têtes au texte chiffré et refuser une version inconnue. Continuer d'ouvrir les fichiers actuels. | M |
| F-06 | moyenne | `js/verrou.js:131` | Après un code valide, la décompression n'a pas de taille maximale. La création du lien ne prévient pas si l'adresse est trop longue pour un message. | `DecompressionStream` puis `TextDecoder`, sans plafond. La longueur chiffrée, elle, est vérifiée. | Plafond du texte décompressé (le schéma des comptes vise déjà 5 000 000 caractères) et avertissement à la création du lien. | S |
| F-07 | faible | `sw.js:22` | Toute réponse HTTP 200 de la même origine est mise en cache, et le nouveau worker prend la main tout de suite. | `cache.put` si `rep.ok` ; `skipWaiting`. La stratégie reste « réseau d'abord ». | Ne mettre en cache que les types attendus (HTML, script, style, police, image). Ne pas changer le numéro de cache dans cet audit : l'intégrateur le montera à la publication. | S |
| F-08 | faible | `.gitignore:2` | Les motifs de données personnelles sont sensibles à la casse. Aucun fichier de données n'est dans le dépôt aujourd'hui. | `*donnees*.json` et `*.backup.json`. | Ajouter les casses usuelles, et un motif pour une copie dont le nom ne contient pas exactement ces lettres. | S |
| F-09 | faible | `.github/workflows/tests.yml:14` | Les actions sont épinglées par une étiquette majeure, pas par un empreinte. Playwright est installé hors du fichier de verrouillage. | `actions/checkout@v5`, `actions/setup-node@v5`, `npm install --no-save playwright@1.63.0`. Les permissions sont en lecture. | Épingler les actions par empreinte. Installer Playwright comme dépendance de développement déjà verrouillée, ou documenter ce choix. | S |
| F-10 | faible | `js/app.js:3587` | Un nom de dette est mis entre guillemets dans le CSV. Un tableur peut quand même traiter comme une formule une cellule dont le texte commence par un signe de formule. | Fonction `texte` : guillemets doublés, séparateur « ; ». | Préfixer ou neutraliser ces cellules à l'export. Les noms à l'écran, eux, passent par `textContent`. | S |
| F-11 | élevée | `README.md:39`, `supabase/schema.sql:36` | La conception des comptes dit « séparément » sans fixer deux dérivations. La réinitialisation par courriel, telle qu'elle est décrite, remplace la seule copie en ligne. | README, préparation des comptes, déclencheur SQL qui n'accepte qu'une version + 1 et ne garde pas l'ancienne enveloppe. | Voir la section « Avant de coder les comptes ». Ne pas coder le client tant que ces points ne sont pas tranchés. | L |

### F-01 — Cadre et politique de contenu

La politique est entièrement dans la balise du document (`index.html`, ligne 6) :

`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`

Ce qui tient : scripts du site seulement, aucune connexion externe, objets interdits, balise `base` interdite, formulaires qui ne peuvent pas être envoyés. `data:` et `blob:` sur les images servent aux masques SVG et aux fichiers créés dans la page. `style-src` autorise les styles en ligne, ce qui est cohérent avec les attributs `style` des graphiques, et ce qui laisse un affichage falsifié possible si du HTML est injecté (F-02).

Ce qui ne tient pas : `frame-ancestors` n'a d'effet que dans un en-tête HTTP. Dans une balise `meta`, les navigateurs l'ignorent. Le dépôt ne contient ni fichier d'en-têtes ni configuration d'hôte. Une autre page peut donc afficher WealthMorand dans un cadre. Elle ne peut pas lire le contenu (autre origine), mais elle peut décaler des clics vers un bouton destructeur (effacer, remplacer, retirer le verrou) si l'écran est dans un état prévisible. La gravité reste moyenne : ces boutons ne sont pas sur l'écran d'ouverture, et il faut deux gestes pour les plus graves.

Correction : faire envoyer par l'hôte la même politique, plus `frame-ancestors 'none'`. Si l'hébergement de pages statiques ne le permet pas, l'écrire dans le README comme risque accepté. Un script qui « sort du cadre » ne remplace pas l'en-tête.

### F-02 — Injection de HTML

Il n'y a pas d'`insertAdjacentHTML` dans `js/`. Les cinq `innerHTML` sont :

| Endroit | Contenu | Donnée saisie ? |
|---|---|---|
| `js/interface.js:38` | chemin SVG pris dans la table `ICONES` | Non. Un nom inconnu ne passe pas par cette fonction : la rangée utilise `textContent`. |
| `js/interface.js:197` | graphique en lignes construit par concaténation | Oui pour le titre, dans un cas. |
| `js/rapport.js:419` | pages du rapport | Textes échappés par `esc` (ligne 12). |
| `js/app.js:2416` | diagramme de flux | Oui pour certaines étiquettes. |
| `js/app.js:3556` | icônes lune et soleil, constantes | Non. |

`esc` (`js/rapport.js:12`) remplace `&`, `<`, `>`, `"` et `'`. Les noms de dettes, d'objectifs, d'enfants, d'actifs, de lignes libres et les champs du dossier pour les proches (assureur, bénéficiaires, documents, notaire, comptable, conseiller, notes) passent par `tableau`, qui appelle `esc` sur chaque cellule, ou par `esc` directement pour les notes (`js/rapport.js:327`, `350`, `351`, `363-373`). Les couleurs des graphiques du rapport sont des constantes (`C(i)`, `COULEUR_MODE`), pas des saisies ; elles ne sont pas échappées, ce qui est sans conséquence tant qu'elles restent des constantes.

Le graphique en lignes n'échappe pas le titre ni les étiquettes d'axe (`js/interface.js:172` et `179`) :

```172:179:js/interface.js
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="${options.titre}">`;
    // ...
    etiquettesX.forEach((t, i) => { if (i % chaque === 0 && (n - 1 - i >= chaque / 2 || i === n - 1) || i === n - 1) s += `<text class="etiquette" x="${x(i)}" y="${H - 6}" text-anchor="${i === n - 1 ? "end" : i === 0 ? "start" : "middle"}">${t}</text>`; });
```

Les appelants passent en général des années ou des mois produits par le navigateur, et des titres fixes. L'exception est le nom d'un plan, saisi librement ou importé (`js/app.js:2509`) : `titre: "Valeur nette : votre plan et " + plan.nom`. Ce nom aboutit dans un attribut. La légende du même graphique, elle, passe par `textContent`.

Le diagramme de flux insère le libellé dans un élément `text` (`js/app.js:2402-2416`). La plupart des libellés sont des constantes. Une clé de `budgetTotaux` devient toutefois une catégorie (`js/app.js:19`, `cat: g`) et peut venir d'un fichier importé : `fusion` conserve les clés absentes de l'exemple. La saisie à l'écran, elle, n'utilise que les catégories du catalogue.

Impact réaliste : balises et styles en ligne dans la page (les styles en ligne sont autorisés). Pas d'exécution de script (`script-src 'self'`, et un script posé par `innerHTML` ne s'exécute pas). Pas d'envoi vers un autre site (`connect-src 'self'`, `form-action 'none'`, `base-uri 'none'`). Une personne qui importe un fichier ou un lien préparé peut voir une interface trompeuse. Ce n'est pas une prise de contrôle du navigateur.

### F-03 — Données importées

`CHAMPS` (`js/catalogues.js:311`) décrit les champs des panneaux « Modifier ». Rien ne l'applique à un fichier, à un lien ni au `localStorage`. `restaurer` (`js/app.js:3326`) n'exige que `version === 1`, un objet `revenu` et un tableau `dettes`.

`fusion` (`js/app.js:24-32`) recopie toute clé absente de l'exemple, et remplace un tableau entier par celui du fichier, sans regarder les éléments. `normaliser` (`js/app.js:91-96`) ne remet en forme que le budget, les autres revenus, les dépenses professionnelles et les plans. Dettes, enfants, objectifs, jalons, actifs, bilans, dossier et suivi passent tels quels. Les chaînes n'ont pas de longueur maximale (noms, notes du dossier). Les tableaux n'ont pas de nombre maximal d'éléments.

Nombres : un JSON peut contenir un nombre qui n'est pas fini. Le motif `+valeur || 0` (budget, dettes) laisse passer l'infini, parce que l'infini est une valeur vraie. La saisie à l'écran, elle, refuse une valeur non finie (`js/app.js:3089`).

Clés `__proto__` et `constructor` : un essai de `fusion` dans Node montre que `Object.prototype` n'est pas modifié. La clé `__proto__` change le prototype de l'objet fusionné pour la session (une propriété héritée est lue si elle manque sur l'objet) ; `JSON.stringify` ne la garde pas. `constructor` devient une propriété propre et est conservée au prochain chargement. Ce n'est pas une exécution de code. Ces clés doivent quand même être rejetées, pour ne pas dépendre de ce comportement.

Boucle : `projeterReee` (`js/calc.js:818-819`) fait `const ans = Math.max(0, 17 - enf.age)` puis une boucle `for` jusqu'à `ans`. Le champ Âge à l'écran a un minimum de 0. L'import ne passe pas par ce champ. Il n'y a pas de plafond. Un âge négatif assez grand pour sortir de la plage des entiers exacts fait que le compteur n'avance plus : la boucle ne se termine pas. Le calcul des dettes, lui, est borné (`moisMax`, au plus 480 mois) ; le coût suit tout de même le nombre de dettes, qui n'est pas borné.

Enchaînement : `restaurer` appelle `sauver()` avant `tout()` (`js/app.js:3328-3330`). Au chargement suivant, `tout()` est appelé avant `classList.add("pret")` (`js/app.js:3921-3923`). Tant que cette classe manque, `main` est masqué (`styles.css:115`). Si le calcul ne revient pas, ou s'il lève une exception (élément de liste qui n'est pas un objet : la lecture de `solde` échoue), la personne n'a plus d'écran pour rétablir l'exemple. La navigation hors de `main` peut rester visible, mais le contenu non. L'ancienne copie locale est déjà écrasée.

Correction : une fonction unique, utilisée par le chargement, le fichier et le lien. Listes blanches pour les choix (milieu, méthode, type de dette). Nombres finis et bornés. Chaînes bornées. Tableaux bornés. Âge d'enfant borné avant toute boucle. Rejeter `__proto__`, `constructor` et `prototype`. N'écrire qu'après un calcul terminé. Si le calcul échoue, garder l'état précédent, poser `pret`, et montrer comment effacer.

### F-04 — Confirmation du remplacement

Le lien montre un résumé puis « Remplacer mes données » (`js/app.js:3436-3448`). Le fichier appelle `restaurer` dès la lecture (`js/app.js:3345`), et le fichier chiffré aussi, sitôt la phrase acceptée (`js/app.js:3356`). Un mauvais fichier, ou un fichier ancien, efface le travail de l'appareil sans aperçu. Gravité moyenne : la personne a choisi « Restaurer », mais elle ne voit pas ce qu'elle remplace, et F-03 montre qu'un fichier peut ensuite bloquer l'app.

### F-05 — En-têtes du coffre

`chiffrer` (`js/verrou.js:26-30`) produit un JSON : marque, `version: 1`, méthode, itérations, sel, vecteur, données. `ouvrirEnveloppe` (`js/verrou.js:34-38`) borne les itérations entre 100 000 et 10 000 000, dérive la clé, puis déchiffre. Le vecteur est nouveau à chaque écriture (12 octets au hasard). Le sel est nouveau à chaque phrase (16 octets). La clé n'est pas exportable. La phrase n'est pas écrite dans `localStorage` ni dans `sessionStorage` ; le champ est vidé après une ouverture réussie. La clé reste en mémoire jusqu'au rechargement, ce qui est le modèle annoncé. Le délai offert est 1, 5, 15 ou 60 minutes (`js/app.js:3510`). Une valeur `0` retombe à 5 minutes (`+valeur || 5`). L'oubli de phrase ne se récupère pas : l'écran l'explique et n'efface que la clé `boussole.v1`.

Limite : `version` et le libellé de méthode ne sont pas authentifiés avec le texte chiffré, et `version` n'est pas vérifiée. Aujourd'hui, changer le sel, le vecteur ou les itérations fait échouer le déchiffrement : on ne peut pas forger un contenu. Le risque est un futur changement d'algorithme qu'un ancien client ignorerait. Le plafond de 10 000 000 d'itérations empêche un fichier de bloquer l'appareil sans fin ; le haut de la fourchette reste coûteux à l'ouverture. Correction compatible : authentifier les en-têtes des nouvelles enveloppes, et continuer d'ouvrir les enveloppes déjà exportées sans ces données associées.

Le plancher de 8 caractères (`js/app.js:3464`) est court pour une phrase courante. Le coût de 600 000 itérations ralentit déjà les essais, et le texte invite à plusieurs mots au hasard. Ce n'est pas un défaut séparé : à trancher dans les questions.

### F-06 — Lien de transfert

Ce qui est solide (`js/verrou.js:96-135`, `js/app.js:3372-3448`) :

- Code de 16 caractères dans un alphabet de 32 symboles (sans 0, O, 1 ni I). Chaque symbole vient de 5 bits d'un octet au hasard (`& 31`), sans biais. 16 × 5 = 80 bits.
- PBKDF2-SHA-256, 200 000 itérations, sel de 16 octets et vecteur de 12 octets, tous deux au hasard, AES-GCM 256. L'en-tête de 6 octets (version, compression, longueur) est passé en données associées : un lien coupé ou modifié est refusé.
- La charge est dans le fragment (`#transfert=`). Le navigateur ne l'envoie pas au serveur. `replaceState` retire le fragment de l'adresse affichée.
- Le code est montré seulement dans le panneau de l'appareil qui envoie (`js/app.js:3394-3396`). Le partage système n'envoie que l'adresse.
- L'autre appareil entre le code, voit un résumé, puis confirme. Un mauvais code, un lien tronqué ou un navigateur sans décompression est refusé, sans remplacer les données.

Ce qui manque : après authentification, `DecompressionStream` n'a pas de plafond (`js/verrou.js:131-134`). La personne qui crée le lien choisit le contenu et connaît le code. Une charge petite et très compressible peut épuiser la mémoire au moment où l'autre appareil entre le code, avant le remplacement : les données déjà là ne sont pas écrasées, l'onglet peut l'être. Aucune taille n'est annoncée à la création : un message ou un navigateur peut couper une adresse longue. Le contrôle de longueur refuse alors le lien, ce qui est correct, mais la personne ne le sait qu'à l'arrivée.

### F-07 — Service worker

`sw.js` : réseau d'abord, cache en secours, `ignoreSearch` à la lecture, origine identique et GET seulement. Les données personnelles ne sont pas des requêtes : elles restent dans `localStorage`. La liste précachée couvre les scripts de `index.html` (`demarrage.js`, `calc.js`, `verrou.js`, `catalogues.js`, `interface.js`, `app.js`, `rapport.js`), la feuille de style, les deux polices, le manifeste et les icônes. À l'activation, les autres caches sont supprimés. L'app propose de recharger quand un nouveau worker prend la main (`js/app.js:3618`).

Risque, sans proposer de monter `wealthmorand-v52` : toute réponse 200 est stockée, y compris un corps qui n'est pas l'application (portail d'accès, page d'erreur servie avec un succès). `skipWaiting` active ce worker sans attendre la fermeture des onglets ; le toast limite la surprise, il ne vérifie pas le corps mis en cache. Si `sw.js` ne change pas, le worker ne se met pas à jour, mais le réseau d'abord écrit quand même les nouveaux fichiers dans le cache dès qu'il y a du réseau. Le numéro de version sert surtout à jeter l'ancien cache à la publication : le laisser tel quel dans cet audit.

### F-08 — Fichiers et stockage local

Clés `localStorage` : `boussole.v1` (état en clair, ou coffre), `wm.verrou.delai`, `wm.details`, `wm.sous.*`, `wealthnord.theme`, `wm.installee`, `wm.assistant`. `sessionStorage` : `wm.ouverture`, `wm.portrait`. Aucune phrase, aucune clé AES. `demarrage.js` ne lit le coffre que pour savoir s'il faut afficher l'écran de verrouillage.

`.gitignore` ignore `*donnees*.json` et `*.backup.json`. Sur un système sensible à la casse, un autre assemblage de majuscules ne correspond pas. `*.backup.json` ne couvre pas un nom qui finit par `backup.json` sans le point au milieu. Recherche dans le dépôt : aucun fichier `*donnees*`, aucun `.env`, aucune clé `service_role`, aucun courriel réel. Les documents de `docs/` décrivent la préparation Supabase et les audits ; ils ne contiennent pas de secret. Ils rappellent de ne pas copier la clé secrète ni le mot de passe de la base.

Sans verrou, l'état (revenus, dettes, dossier pour les proches) est en clair dans le stockage du navigateur. C'est le choix du produit : le verrou est facultatif. Un appareil partagé ou une copie de sauvegarde du navigateur expose alors ces données.

### F-09 — Chaîne d'approvisionnement

`package.json` : aucune dépendance d'exécution. Développement seulement, versions exactes : `eslint` 10.13.0, `@eslint/js` 10.0.1, `globals` 17.13.0. `package-lock.json` porte les empreintes. Les polices sont locales (`styles.css`, `@font-face` vers `polices/inter.woff2` et `polices/newsreader.woff2`). Aucune adresse externe dans `index.html`, les scripts ou la feuille de style (les `data:` sont des masques SVG).

Le flux `.github/workflows/tests.yml` limite le jeton à `contents: read`, ne se déclenche pas par `pull_request_target`, et lance `npm ci`. Les actions `checkout` et `setup-node` sont en `@v5` : une étiquette majeure peut bouger. Playwright `1.63.0` est installé avec `--no-save` (`.cursor/install.sh` fait de même) : l'empreinte n'est pas dans le verrouillage du dépôt. Avec un jeton en lecture seule, une action compromise ne peut pas pousser sur le dépôt ; elle peut encore modifier le résultat des tests le temps du flux. Gravité faible.

### F-10 — Export CSV

`js/app.js:3584-3588` entoure chaque nom de guillemets et double les guillemets internes. C'est le bon échappement CSV. Plusieurs tableurs, après avoir retiré ces guillemets, évaluent quand même une cellule qui commence par un signe de formule. Le fichier est produit sur l'appareil ; le risque apparaît si on l'ouvre ou si on l'envoie au comptable, surtout quand le nom vient d'un import (F-03). Les mêmes noms, dans les pages, passent par `textContent` ou par `esc`.

### F-11 — Conception des comptes

Rien n'est branché dans `js/`. Le README (lignes 35 à 43) fixe le bon modèle : un seul compte, Supabase au Canada, une ligne par compte, mot de passe qui ne quitte pas l'appareil, PBKDF2-SHA-256, clé AES-GCM séparée, inscriptions fermées ensuite. `supabase/schema.sql` est aligné sur ce modèle pour la ligne et les droits. Le détail manquant, et le risque si on code trop tôt, sont dans la dernière section. Gravité élevée parce qu'une seule dérivation, ou un écrasement du coffre au moment d'un courriel de réinitialisation, toucherait la seule copie qui quitte l'appareil.

## Vérifié correct

- Politique : `script-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`. Pas de script dans le HTML (`demarrage.js` est un fichier à part pour cette raison).
- Rapport PDF : `esc` sur les textes libres, y compris le dossier pour les proches. `innerHTML` des icônes de thème : constantes.
- Verrou : PBKDF2-SHA-256, 600 000 itérations, AES-GCM 256, sel 16 octets et vecteur 12 octets au hasard à chaque chiffrement, clé non exportable, phrase normalisée NFC, phrase absente du stockage, itérations du fichier bornées, rechargement pour oublier la clé, délai 1 à 60 minutes, autre onglet détecté par l'événement `storage`.
- Lien : 80 bits sans biais, fragment, en-tête authentifié, longueur chiffrée vérifiée, code affiché seulement sur l'appareil source, confirmation avant remplacement.
- Service worker : réseau d'abord, données personnelles hors du cache, liste de fichiers cohérente avec la page. Le numéro `wealthmorand-v52` ne doit pas être modifié ici.
- Dépendances d'exécution : aucune. Polices locales. Jeton d'intégration en lecture seule.
- Schéma SQL déjà en place : RLS activée, quatre politiques « le sien », `anon` sans droit, `search_path` vide, exécution de la fonction retirée, `maj` forcée par le serveur, version qui doit avancer d'un seul pas en mise à jour. La clé secrète n'est pas dans le dépôt.

## Questions pour la personne

1. L'hébergement peut-il envoyer un en-tête HTTP (`frame-ancestors 'none'`), ou la page reste-t-elle sur un hôte qui ne le permet pas ?
2. Le mot de passe de 47 caractères envoyé à Supabase, décrit dans la préparation des comptes, est-il calculé à part de la clé AES ? Où le sel sera-t-il gardé ?
3. Si le mot de passe est réinitialisé par courriel sur un appareil qui n'a pas les données en clair, confirmez-vous qu'il faut refuser d'écrire par-dessus le coffre ?
4. Faut-il le même aperçu et la même confirmation pour un fichier que pour le lien de transfert ?
5. Le plancher de 8 caractères pour la phrase de passe vous convient-il, avec le coût des 600 000 itérations comme seul frein aux essais ?

## Avant de coder les comptes

Le modèle reste celui du README : un seul compte, données chiffrées sur l'appareil, Supabase, et le lien de transfert qui continue d'être offert. Ne pas ajouter le SDK comme dépendance d'exécution : appeler l'API avec `fetch`. Ne pas élargir `connect-src` au-delà de l'origine du projet.

1. **Deux dérivations, pas une.** Le README dit que le mot de passe donne, séparément, un mot de passe de connexion et la clé AES. Ni le README, ni `schema.sql`, ni la préparation ne fixent les sels ni les libellés. La préparation parle d'un mot de passe dérivé de 47 caractères que l'app envoie à Supabase : ce secret traverse le réseau et peut apparaître dans les journaux du service d'authentification. Il ne doit pas être la clé qui déchiffre `coffres.donnees`. Concrètement : un PBKDF2-SHA-256 lent (au moins 600 000 itérations, sel aléatoire de 16 octets, pas le courriel seul) qui produit un secret maître qui ne quitte pas l'appareil ; puis deux dérivations légères avec des libellés distincts, l'une pour le mot de passe Supabase, l'autre pour la clé AES-GCM 256. Le sel public se range dans une colonne non secrète ou dans l'enveloppe, pour qu'un deuxième appareil puisse refaire le calcul après la phrase.

2. **Réinitialisation par courriel = nouvelle clé, pas une récupération.** La préparation le dit : un nouveau mot de passe donne une nouvelle clé, et la copie en ligne est remplacée par celle de l'appareil. Sur un appareil qui n'a que l'exemple, ou rien, cet envoi détruit la seule copie chiffrée, sans permettre de lire l'ancienne. Avant d'envoyer le courriel, l'interface doit dire que les données en ligne deviennent illisibles sans une copie déjà ouverte quelque part. Le client ne doit écrire le coffre que s'il a déjà déchiffré l'enveloppe actuelle sur cet appareil, puis l'a rechiffrée. Sinon, refuser l'écriture.

3. **Garder l'enveloppe précédente.** Les politiques autorisent `UPDATE` et `DELETE` sur la seule ligne. Le déclencheur (`supabase/schema.sql:36-45`) refuse une version qui ne vaut pas exactement l'ancienne plus un, ce qui empêche un appareil en retard d'écraser en silence. Il ne conserve pas l'octet précédent. Une écriture authentifiée (session volée, bogue, appareil vide après un courriel) remplace donc tout. Ajouter une table ou une colonne d'archive, bornée, écrite par le même déclencheur. En cas d'erreur `40001`, recharger et montrer les deux dates ; ne pas inventer une fusion automatique.

4. **Même enveloppe que le verrou, puis le schéma de F-03.** AES-GCM, vecteur unique, en-têtes authentifiés, version de format. Vérifier le sceau avant de remplacer l'état local. Appliquer les bornes de F-03 au JSON déchiffré. Respecter le plafond SQL de 5 000 000 caractères avant l'envoi. La colonne `appareil` (80 caractères) ne doit pas recevoir un nom de personne.

5. **Ce que le serveur voit.** Le courriel du compte, l'adresse IP, les dates, la clé publique du projet, et du texte chiffré. Pas la phrase, pas la clé AES, pas les montants. La clé `service_role` contourne les politiques même avec `FORCE ROW LEVEL SECURITY` : elle ne va pas dans l'app ni dans le dépôt. `FORCE ROW LEVEL SECURITY` reste utile pour le rôle propriétaire. La fermeture des inscriptions est un réglage du tableau de bord, pas une contrainte du SQL : la refermer dès le premier compte créé. Un deuxième compte ne lirait pas la ligne du premier (RLS), il ne doit simplement pas exister.

6. **Jeton de session.** Il ne déchiffre pas le coffre si la clé AES est bien séparée. Il permet de remplacer ou de supprimer la ligne. Ne pas le journaliser, ne pas le mettre dans l'URL. Le verrou local et le lien de transfert restent les chemins sans compte.

7. **Politique de contenu.** Ajouter l'origine du projet à `connect-src` seulement, de préférence dans l'en-tête HTTP du F-01. Ne pas ouvrir `script-src`.

8. **Reprendre les essais déjà décrits** quand le client existera : une autre personne authentifiée ne lit pas la ligne, un visiteur anonyme est refusé, une version sautée est refusée, un appareil qui n'a pas la phrase ne produit pas de JSON exploitable, un courriel de réinitialisation ne déclenche pas d'écriture si l'appareil n'a pas déchiffré le coffre.
