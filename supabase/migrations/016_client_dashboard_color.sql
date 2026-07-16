-- ═══════════════════════════════════════════════════════════════
-- Migration 016: Add dashboard_color to clients for chart identity
-- Each client gets a persistent color used across all analytics
-- visualizations to distinguish their data from competitors
-- ═══════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS dashboard_color text DEFAULT '#0F6E56';

-- Seed colors for existing clients based on hash of their id
-- Color pool: teal, coral, pink, purple, blue, amber, rose, indigo
UPDATE public.clients
SET dashboard_color = CASE
  WHEN md5(id::text) ~ '^[0-3]' THEN '#0F6E56'  -- teal
  WHEN md5(id::text) ~ '^[4-7]' THEN '#E07A5F'  -- coral
  WHEN md5(id::text) ~ '^[8-b]' THEN '#9B5DE5'  -- purple
  WHEN md5(id::text) ~ '^[c-f]' THEN '#00B4D8'  -- blue
END
WHERE dashboard_color = '#0F6E56';

COMMIT;
