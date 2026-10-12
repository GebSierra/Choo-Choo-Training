-- Choo Choo Training: paid access (Stripe). Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe to run again. Needs supabase/schema.sql to have been run first (it uses auth.users).

-- One row per grown-up: what they have paid for. Only the Stripe webhook function (service role) writes here.
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users on delete cascade,
  -- Stripe subscription status, or 'none' (never subscribed), 'refunded', 'disputed'.
  status text not null default 'none',
  -- true while the grown-up should have the paid part of the app. The webhook keeps this in step with status.
  access boolean not null default false,
  plan text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  updated_at timestamptz not null default now()
);

-- Row-level security: a signed-in user can READ only their own row. Nobody but the service role can write.
alter table public.entitlements enable row level security;

drop policy if exists "entitlements select own" on public.entitlements;
create policy "entitlements select own" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.entitlements from anon;
revoke all on public.entitlements from authenticated;
grant select on public.entitlements to authenticated;

-- Every Stripe event is recorded once, so a retried delivery is not processed twice.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;
