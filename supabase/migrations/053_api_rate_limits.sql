-- 053_api_rate_limits.sql
-- DB-backed rate limiter table for serverless (Vercel) multi-instance correctness.
create table if not exists public.api_rate_limits (
  route_key    text        not null,
  client_key   text        not null,
  window_start timestamptz not null default now(),
  count        integer     not null default 0,
  created_at   timestamptz not null default now(),
  primary key (route_key, client_key)
);
create index if not exists idx_api_rate_limits_created_at
  on public.api_rate_limits (created_at);
alter table public.api_rate_limits enable row level security;
-- service_role bypasses RLS; no policies needed for end users.
