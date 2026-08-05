-- 055_report_generation_locks.sql
-- Per-client concurrency guard for synchronous report generation (DoS mitigation).
create table if not exists public.report_generation_locks (
  client_id uuid primary key,
  started_at timestamptz not null default now()
);
