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
