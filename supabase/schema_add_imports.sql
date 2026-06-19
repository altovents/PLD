-- ── Run this migration in Supabase SQL editor ─────────────────────────────────

-- 1. Add 'audit' plan to profiles
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('trial', 'starter', 'growth', 'pro', 'audit'));

-- 2. Create imports tracking table
create table if not exists public.imports (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete cascade not null,
  filename         text not null,
  transaction_count int not null default 0,
  leaks_count      int not null default 0,
  format           text,
  created_at       timestamptz default now()
);

alter table public.imports enable row level security;

create policy "Users see own imports"
  on public.imports for all
  using (auth.uid() = user_id);
