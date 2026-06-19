-- ── Run this migration in Supabase SQL editor ─────────────────────────────────
-- Adds new leak types for the expanded analysis engine

alter table public.leaks drop constraint if exists leaks_type_check;

alter table public.leaks
  add constraint leaks_type_check
  check (type in (
    'duplicate',
    'unused_subscription',
    'price_increase',
    'progressive_increase',
    'bank_fees',
    'overlapping_services',
    'annual_optimization',
    'progressive_drift',
    'currency_fees',
    'ghost_reactivation',
    'late_fees'
  ));
