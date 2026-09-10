BEGIN;
-- outlets and consumer_intercepts dual GPS fields; gps_lat/lng kept as final for backwards compat
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS gps_raw_lat double precision;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS gps_raw_lng double precision;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS gps_final_lat double precision;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS gps_final_lng double precision;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS accuracy_m double precision;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS accuracy_tier text CHECK (accuracy_tier IN ('high','medium','manual'));
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS source text CHECK (source IN ('census_gps','census_manual_pin','app_background'));
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS ward_auto text;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS ward_final text;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS snapped boolean DEFAULT false;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS distance_m double precision;

ALTER TABLE public.consumer_intercepts ADD COLUMN IF NOT EXISTS gps_raw_lat double precision;
ALTER TABLE public.consumer_intercepts ADD COLUMN IF NOT EXISTS gps_raw_lng double precision;
ALTER TABLE public.consumer_intercepts ADD COLUMN IF NOT EXISTS gps_final_lat double precision;
ALTER TABLE public.consumer_intercepts ADD COLUMN IF NOT EXISTS gps_final_lng double precision;
ALTER TABLE public.consumer_intercepts ADD COLUMN IF NOT EXISTS accuracy_m double precision;
ALTER TABLE public.consumer_intercepts ADD COLUMN IF NOT EXISTS accuracy_tier text CHECK (accuracy_tier IN ('high','medium','manual'));
ALTER TABLE public.consumer_intercepts ADD COLUMN IF NOT EXISTS source text CHECK (source IN ('census_gps','census_manual_pin','app_background'));
ALTER TABLE public.consumer_intercepts ADD COLUMN IF NOT EXISTS ward_auto text;
ALTER TABLE public.consumer_intercepts ADD COLUMN IF NOT EXISTS ward_final text;
ALTER TABLE public.consumer_intercepts ADD COLUMN IF NOT EXISTS snapped boolean DEFAULT false;
ALTER TABLE public.consumer_intercepts ADD COLUMN IF NOT EXISTS distance_m double precision;

-- keep publication for SSE war-room-live if used
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='war-room-live') THEN
    ALTER PUBLICATION "war-room-live" ADD TABLE public.outlets, public.consumer_intercepts;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL;
END $$;

-- backfill gps_final from gps_lat/lng where missing
UPDATE public.outlets SET gps_final_lat = gps_lat, gps_final_lng = gps_lng WHERE gps_final_lat IS NULL AND gps_lat IS NOT NULL;
UPDATE public.consumer_intercepts SET gps_final_lat = gps_lat, gps_final_lng = gps_lng WHERE gps_final_lat IS NULL AND gps_lat IS NOT NULL;

COMMIT;
