BEGIN;

-- mv_census_cube: geo x channel x type x day from outlets
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_census_cube AS
SELECT
  COALESCE(county,'Unknown')  AS county,
  COALESCE(ward,'Unknown')    AS ward,
  COALESCE(channel,'Unknown') AS channel,
  COALESCE(outlet_type,'Unknown') AS outlet_type,
  (created_at::date) AS day,
  count(*)::int AS outlet_count
FROM public.outlets
WHERE deleted_at IS NULL
GROUP BY 1,2,3,4,5;

CREATE UNIQUE INDEX IF NOT EXISTS mv_census_cube_uidx
  ON public.mv_census_cube (county,ward,channel,outlet_type,day);

-- mv_visit_cube: rep x zone x outcome x day from visits
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_visit_cube AS
SELECT
  rep_id,
  COALESCE((SELECT zone FROM public.reps r WHERE r.id = v.rep_id),'Unknown') AS zone,
  COALESCE(outcome,'Unknown') AS outcome,
  COALESCE(status,'Unknown')  AS status,
  (COALESCE(check_in_at, created_at)::date) AS day,
  count(*)::int AS visit_count,
  count(*) FILTER (WHERE order_placed) ::int AS order_count,
  COALESCE(sum(order_value) FILTER (WHERE order_placed),0) AS order_value_sum
FROM public.visits v
WHERE deleted_at IS NULL
GROUP BY 1,2,3,4,5;

CREATE UNIQUE INDEX IF NOT EXISTS mv_visit_cube_uidx
  ON public.mv_visit_cube (rep_id,zone,outcome,status,day);

-- mv_intercept_cube: ward x channel x day
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_intercept_cube AS
SELECT
  COALESCE(ward_final, ward_auto, ward,'Unknown') AS ward,
  COALESCE(channel,'Unknown') AS channel,
  (COALESCE(captured_at, created_at)::date) AS day,
  count(*)::int AS intercept_count
FROM public.consumer_intercepts
GROUP BY 1,2,3;

CREATE UNIQUE INDEX IF NOT EXISTS mv_intercept_cube_uidx
  ON public.mv_intercept_cube (ward,channel,day);

-- mv_profitability_bridge stub: route x day (0 rows until pricing synced; shape for cube)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_profitability_bridge AS
SELECT
  rm.id AS route_id,
  rm.group_name,
  rm.name AS route_name,
  (now()::date) AS day,
  0::int AS tonnage_dummy,
  0::numeric AS sales_dummy
FROM public.routes_master rm
WHERE false;

CREATE UNIQUE INDEX IF NOT EXISTS mv_profitability_bridge_uidx
  ON public.mv_profitability_bridge (route_id, day);

-- pg_cron hourly refresh (requires pg_cron extension; comment is declarative if cron not enabled)
-- SELECT cron.schedule('refresh-cuboid-lite-hourly','0 * * * *', $$ REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_census_cube; REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_visit_cube; REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_intercept_cube; REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_profitability_bridge; $$);
-- To refresh manually: REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_census_cube;

COMMIT;
