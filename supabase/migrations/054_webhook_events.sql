-- 054_webhook_events.sql
-- Stripe webhook idempotency + audit trail.
create table if not exists public.webhook_events (
  id             bigserial primary key,
  stripe_event_id text not null unique,
  event_type     text not null,
  received_at    timestamptz not null default now(),
  processed_at   timestamptz,
  status         text not null default 'received'
);
