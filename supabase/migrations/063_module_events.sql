-- 063_module_events.sql
-- Event ledger for module integration pushes (spec §11: explicit integration
-- layer). Every inbound webhook/metric snapshot from an operational system
-- (e.g. NAMPARK RMS) is recorded here exactly once — event_id is the
-- idempotency key (spec §7: sync must be idempotent).

CREATE TABLE IF NOT EXISTS public.module_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'nampark',
  module_type text NOT NULL DEFAULT 'route_mapping'
    CHECK (module_type IN ('route_mapping')),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tenant_external_id text,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_module_events_client_received
  ON public.module_events(client_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_module_events_source_type
  ON public.module_events(source, event_type, occurred_at DESC);

ALTER TABLE public.module_events ENABLE ROW LEVEL SECURITY;
-- No client-facing policy: writes happen via service role (ingest endpoint),
-- staff reads can use service role too until a portal view needs it.
