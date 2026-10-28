# Comptes WealthMorand : script pour Claude dans Chrome

Ce script prépare, dans votre navigateur, le service de comptes de
WealthMorand : un projet Supabase gratuit, au Canada, qui garde vos données
**chiffrées sur l'appareil** pour les synchroniser entre le téléphone et
l'ordinateur. Le serveur ne voit ni votre mot de passe ni vos données.

Mode d'emploi :

1. Sur l'ordinateur, ouvrez Claude dans Chrome et collez la **partie 1**
   en entier. Restez à côté : il s'arrête quand il faut vous connecter ou
   copier un mot de passe.
2. Donnez à Claude Code les deux lignes du résumé final (adresse du projet
   et clé publique). L'app est branchée sur votre projet.
3. Créez votre compte dans l'app, **avec le même courriel que votre compte
   Supabase** (les courriels intégrés de Supabase ne partent qu'aux membres
   du projet : sinon, « Mot de passe oublié » ne vous joindrait pas).
4. Collez la **partie 2** dans Claude dans Chrome : il ferme les
   inscriptions.

## Partie 1 : créer le projet

```text
Tu vas m'aider à préparer, dans mon navigateur, le service de comptes de mon app WealthMorand : un projet Supabase gratuit, au Canada, qui gardera mes données chiffrées pour les synchroniser entre mon téléphone et mon ordinateur.

Règles pour toute la tâche :
1. Je me connecte moi-même et je tape moi-même tout mot de passe. Si une page demande une connexion, une inscription, un code ou un mot de passe, arrête-toi et dis-moi quoi faire.
2. Ne copie, n'affiche et ne colle jamais : une clé secrète (elle commence par sb_secret_), la clé service_role, ni le mot de passe de la base de données.
3. Reste sur le forfait gratuit (Free) : n'entre aucune carte de crédit et n'active rien de payant.
4. Ne mets mon nom nulle part : organisation, projet, descriptions.
5. Ne modifie aucun autre projet ni aucune autre organisation.
6. Avant chaque action qui crée ou modifie quelque chose, dis-moi en une phrase ce que tu vas faire. Si l'écran ne ressemble pas à ce que je décris (Supabase change parfois son interface), cherche l'équivalent, explique-moi ce que tu as trouvé, puis continue.
7. Si une étape échoue, ne contourne rien : arrête-toi et copie-moi le message exact.

Étapes :

1. Ouvre https://supabase.com/dashboard. Si je ne suis pas connecté(e), arrête-toi : je me connecte moi-même (avec GitHub ou mon courriel).

2. Organisation : s'il en existe déjà une dont le nom ne contient pas mon nom, utilise-la. Sinon, crée une organisation nommée « WealthMorand », de type « Personal », au forfait « Free ».

3. Crée un nouveau projet dans cette organisation :
   - Nom : wealthmorand
   - Région : Canada (Central)
   - Mot de passe de la base de données : clique sur « Generate a password », puis arrête-toi pour que je le copie moi-même dans mon gestionnaire de mots de passe (l'app n'en a pas besoin).
   - Options de sécurité, si elles sont affichées : laisse « Enable Data API » activé et « Automatically expose new tables and functions » désactivé ; garde les autres réglages par défaut.
   Crée le projet et attends qu'il soit prêt (quelques minutes).

4. Ouvre SQL Editor, crée une nouvelle requête (New query), colle exactement le code SQL ci-dessous, puis clique sur Run. Résultat attendu : « Success. No rows returned ». Ne modifie pas le code ; en cas d'erreur, copie-moi le message. Si Supabase signale une « opération destructive » (à cause des lignes « drop … if exists »), confirme : elles ne retirent que des éléments de ce script.

--- début du code SQL ---
-- WealthMorand : synchronisation par compte (Supabase, région Canada).
-- Une seule ligne par compte : vos données, chiffrées sur l'appareil (AES-GCM 256 bits) avant l'envoi.
-- Le serveur ne voit ni votre mot de passe ni vos données : seulement du texte chiffré.
-- À coller tel quel dans l'éditeur SQL de Supabase (SQL Editor, New query), puis Run.

create table if not exists public.coffres (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  donnees text not null check (char_length(donnees) between 1 and 5000000),   -- l'enveloppe chiffrée
  version bigint not null default 1 check (version >= 1),                      -- +1 à chaque envoi
  appareil text check (char_length(appareil) <= 80),                           -- « iPhone », « Mac »…
  maj timestamptz not null default now()
);

-- Depuis le 30 octobre 2026, une table n'est offerte au Data API que si on le permet :
-- les personnes connectées seulement, jamais les visiteurs anonymes.
revoke all on table public.coffres from anon, authenticated;
grant select, insert, update, delete on table public.coffres to authenticated;

-- Chacun ne voit et ne modifie que sa propre ligne. (Le script peut être relancé sans erreur.)
alter table public.coffres enable row level security;
drop policy if exists "coffre : lire le sien" on public.coffres;
drop policy if exists "coffre : créer le sien" on public.coffres;
drop policy if exists "coffre : modifier le sien" on public.coffres;
drop policy if exists "coffre : supprimer le sien" on public.coffres;
create policy "coffre : lire le sien" on public.coffres
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "coffre : créer le sien" on public.coffres
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "coffre : modifier le sien" on public.coffres
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "coffre : supprimer le sien" on public.coffres
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Le serveur date chaque envoi, et la version avance d'un seul pas : un appareil en retard
-- ne peut pas écraser, sans le savoir, ce qu'un autre vient d'envoyer.
create or replace function public.coffres_avant_envoi() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.version <> old.version + 1 then
    raise exception 'version attendue : %', old.version + 1 using errcode = '40001';
  end if;
  new.maj := now();
  return new;
end;
$$;
revoke execute on function public.coffres_avant_envoi() from public, anon, authenticated;
drop trigger if exists coffres_avant_envoi on public.coffres;
create trigger coffres_avant_envoi before insert or update on public.coffres
  for each row execute function public.coffres_avant_envoi();
--- fin du code SQL ---

5. Vérifie :
   - Table Editor : la table « coffres » existe, avec la sécurité au niveau des lignes (RLS) activée.
   - Authentication, Policies : la table « coffres » a 4 politiques (lire, créer, modifier et supprimer « le sien »).

6. Authentication, Sign In / Providers :
   - « Allow new users to sign up » : activé pour l'instant (je créerai mon compte dans l'app, puis on le fermera).
   - « Allow anonymous sign-ins » : désactivé.
   - Fournisseur « Email » : activé ; « Confirm email » : désactivé ; « Secure email change » : activé.
   - Laisse « Password requirements » et « Minimum password length » à leurs valeurs par défaut : l'app envoie un mot de passe dérivé de 47 caractères qui les respecte.
   - Enregistre (Save).

7. Authentication, URL Configuration :
   - Site URL : https://raymondchabot.github.io/Chabot/
   - Redirect URLs : ajoute https://raymondchabot.github.io/Chabot/
   - Enregistre.

8. Authentication, Emails, Templates, « Reset Password » :
   - Objet : WealthMorand : choisir un nouveau mot de passe
   - Message (remplace tout le contenu par ces quatre lignes) :
     <h2>Nouveau mot de passe</h2>
     <p>Pour choisir un nouveau mot de passe WealthMorand, ouvrez ce lien sur l'appareil où vous utilisez l'app :</p>
     <p><a href="{{ .ConfirmationURL }}">Choisir un nouveau mot de passe</a></p>
     <p>Vous n'avez rien demandé ? Ignorez ce courriel : rien ne change.</p>
   - Enregistre.

9. Clés : ouvre Settings, API Keys (ou le bouton « Connect » en haut du projet). Note :
   - l'adresse du projet (Project URL), du genre https://abcdefghijkl.supabase.co ;
   - la clé publique « publishable » (elle commence par sb_publishable_). S'il n'y en a pas, crée-la (« Create new API keys »). Si seules les anciennes clés existent, prends la clé « anon public », jamais « service_role ».
   Ces deux valeurs sont faites pour être publiques : l'app les contiendra.

10. Advisors, Security Advisor : lance l'analyse et dis-moi s'il y a une erreur (attendu : aucune pour la table « coffres »).

11. Termine par un résumé : ce qui est fait, ce qui ne l'est pas, puis ces deux lignes, prêtes à copier :
    Adresse du projet : …
    Clé publique : …
```

## Partie 2 : fermer les inscriptions

À lancer après avoir créé votre compte dans l'app.

```text
Suite de la préparation de WealthMorand dans Supabase (projet « wealthmorand ») : j'ai créé mon compte dans l'app. Mêmes règles que la première fois : je me connecte moi-même ; tu ne copies aucune clé secrète ni aucun mot de passe ; tu me dis ce que tu vas faire avant chaque modification ; en cas d'erreur, tu t'arrêtes et tu me copies le message.

1. Authentication, Users : vérifie qu'il y a exactement un utilisateur, avec mon courriel. S'il y en a d'autres, liste-les sans rien supprimer, puis arrête-toi.
2. Authentication, Sign In / Providers : désactive « Allow new users to sign up », puis enregistre.
3. Table Editor, table « coffres » : vérifie qu'il y a une ligne, dont la colonne « donnees » contient du texte illisible (chiffré). N'en copie pas le contenu.
4. Résumé : confirme que les inscriptions sont fermées et qu'il n'y a qu'un compte.
```

## À savoir

- **Pause du forfait gratuit** : un projet sans activité pendant 7 jours est
  mis en pause (Supabase prévient par courriel). Ouvrir l'app de temps en
  temps suffit à le garder actif. En pause, l'app fonctionne quand même sur
  chaque appareil ; « Resume project », dans le tableau de bord, le relance
  avec toutes ses données.
- **Courriels** : sans service d'envoi à vous, Supabase envoie au plus
  2 courriels par heure, et seulement aux membres du projet.
- **Mot de passe oublié** : un nouveau mot de passe donne une nouvelle clé de
  chiffrement ; la copie en ligne, chiffrée avec l'ancienne, est remplacée
  par celle de votre appareil.
- Le schéma vient de `supabase/schema.sql` : il a été essayé sur PostgreSQL
  (une ligne par compte, un autre compte ne voit rien, un appareil en retard
  ne peut rien écraser, un visiteur anonyme est refusé).
