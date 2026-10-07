-- Choo Choo Training: grown-up accounts. Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe to run again: it only creates what is missing and replaces the function and policies.

-- One row per grown-up: the app's whole progress state as JSON.
create table if not exists public.progress (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row-level security: a signed-in user can read, add and change only their own row. Nobody can delete rows directly
-- (deleting the account removes the row through the cascade above).
alter table public.progress enable row level security;

drop policy if exists "progress select own" on public.progress;
create policy "progress select own" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "progress insert own" on public.progress;
create policy "progress insert own" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "progress update own" on public.progress;
create policy "progress update own" on public.progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- The anonymous (signed-out) role gets nothing on this table.
revoke all on public.progress from anon;
grant select, insert, update on public.progress to authenticated;

-- "Delete account" in the app: removes the caller's progress and then the caller's login. Runs with the rights of its
-- owner (security definer) because a user cannot delete themselves from auth.users; it only ever touches auth.uid().
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from public.progress where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
