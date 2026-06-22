-- Users profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  first_name text,
  last_name text,
  company text,
  plan text default 'trial' check (plan in ('trial', 'starter', 'growth', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  tink_user_id text,
  created_at timestamptz default now()
);

-- Migration (run if table already exists):
-- alter table public.profiles add column if not exists tink_user_id text;

-- Transactions imported from Tink
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  tink_id text unique,
  amount numeric not null,
  currency text default 'CHF',
  description text,
  vendor text,
  category text check (category in ('subscription', 'supplier', 'one_shot', 'bank_fee', 'other')),
  date date not null,
  created_at timestamptz default now()
);

-- Detected leaks
create table if not exists public.leaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('duplicate', 'unused_subscription', 'price_increase', 'progressive_increase')) not null,
  title text not null,
  description text,
  estimated_savings numeric not null,
  priority text check (priority in ('high', 'medium', 'low')) default 'medium',
  vendor text,
  status text check (status in ('open', 'resolved', 'dismissed')) default 'open',
  detected_at timestamptz default now(),
  resolved_at timestamptz
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.leaks enable row level security;

-- RLS Policies
create policy "Users see own profile" on public.profiles for all using (auth.uid() = id);
create policy "Users see own transactions" on public.transactions for all using (auth.uid() = user_id);
create policy "Users see own leaks" on public.leaks for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, company)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'company'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Company context (onboarding)
create table if not exists public.company_context (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  industry text check (industry in ('restauration', 'industrie', 'services', 'commerce', 'sante', 'autre')) default 'autre',
  employees_count text check (employees_count in ('1-5', '6-20', '21-50', '51-200', '200+')) default '1-5',
  alert_thresholds jsonb default '{"price_increase_pct": 10, "duplicate_days": 7, "progressive_drift_pct": 15}'::jsonb,
  budget_categories jsonb default '{}'::jsonb,
  trusted_vendors jsonb default '[]'::jsonb,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.company_context enable row level security;
create policy "Users manage own context" on public.company_context for all using (auth.uid() = user_id);

-- Add transparency columns to leaks
alter table public.leaks
  add column if not exists trigger_transaction_ids jsonb default '[]'::jsonb,
  add column if not exists detection_logic text,
  add column if not exists comparison_basis jsonb default '{}'::jsonb,
  add column if not exists resolution_note text,
  add column if not exists contacted_vendor_at timestamptz;

-- Extend leaks status to include 'acknowledged'
alter table public.leaks drop constraint if exists leaks_status_check;
alter table public.leaks add constraint leaks_status_check
  check (status in ('open', 'acknowledged', 'resolved', 'dismissed'));
