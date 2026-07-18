-- Seed demo analytics data for portal clients
-- Inserts sample data into analytics_fact_sales so portal analytics charts render

INSERT INTO public.analytics_fact_sales (client_id, date, revenue, impressions, clicks, conversions, spend, source)
SELECT
  c.id,
  d::date,
  (random() * 500000 + 10000)::numeric(12,2) as revenue,
  floor(random() * 50000 + 500)::int as impressions,
  floor(random() * 2000 + 20)::int as clicks,
  floor(random() * 50 + 1)::int as conversions,
  (random() * 200000 + 5000)::numeric(12,2) as spend,
  CASE floor(random() * 4)::int
    WHEN 0 THEN 'digital'
    WHEN 1 THEN 'print'
    WHEN 2 THEN 'social'
    WHEN 3 THEN 'outdoor'
  END as source
FROM public.clients c
CROSS JOIN (
  SELECT generate_series(
    CURRENT_DATE - interval '365 days',
    CURRENT_DATE,
    '1 day'::interval
  )::date as d
) dates
WHERE c.id IN (SELECT id FROM public.clients ORDER BY created_at ASC LIMIT 5)
ON CONFLICT DO NOTHING;

-- Also seed a few summarized monthly rows if the table uses a monthly grain
INSERT INTO public.analytics_fact_sales (client_id, date, revenue, impressions, clicks, conversions, spend, source)
SELECT
  c.id,
  date_trunc('month', d)::date as date,
  (random() * 2000000 + 50000)::numeric(12,2),
  floor(random() * 200000 + 2000)::int,
  floor(random() * 8000 + 100)::int,
  floor(random() * 200 + 5)::int,
  (random() * 800000 + 20000)::numeric(12,2),
  'aggregated'
FROM public.clients c
CROSS JOIN (
  SELECT generate_series(
    date_trunc('month', CURRENT_DATE - interval '23 months'),
    date_trunc('month', CURRENT_DATE),
    '1 month'::interval
  )::date as d
) dates
WHERE c.id IN (SELECT id FROM public.clients ORDER BY created_at ASC LIMIT 5)
ON CONFLICT DO NOTHING;
