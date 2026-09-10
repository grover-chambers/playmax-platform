-- 074_drop_unscoped_client_analytics_policies.sql
-- SECURITY FIX (P0): multi-tenant RLS breach.
--
-- Migration 052 renamed the analytics client policies to scoped variants
-- ("client can read analytics_* scoped") that restrict clients to their
-- portal_analytics_sharing allow-list. Later migrations 067 / 071 / 072
-- re-created UNscoped policies with NEW names ("client can read
-- analytics_branches", "client can read fact_sales", "client can read
-- fact_sales v2", ...). Postgres ORs permissive SELECT policies, so the
-- unscoped siblings grant EVERY client role access to all rows on these
-- tables, defeating the scoped policy and leaking every tenant's analytics.
--
-- This migration drops every unscoped client-readable variant (idempotently,
-- so it is safe to re-run regardless of which variants exist in an env) and
-- asserts no unscoped client policy survives.
BEGIN;

DROP POLICY IF EXISTS "client can read analytics_fact_sales" ON public.analytics_fact_sales;
DROP POLICY IF EXISTS "client can read fact_sales" ON public.analytics_fact_sales;
DROP POLICY IF EXISTS "client can read fact_sales v2" ON public.analytics_fact_sales;

DROP POLICY IF EXISTS "client can read analytics_fact_inventory" ON public.analytics_fact_inventory;
DROP POLICY IF EXISTS "client can read fact_inventory" ON public.analytics_fact_inventory;

DROP POLICY IF EXISTS "client can read analytics_suppliers" ON public.analytics_suppliers;
DROP POLICY IF EXISTS "client can read suppliers" ON public.analytics_suppliers;

DROP POLICY IF EXISTS "client can read analytics_branches" ON public.analytics_branches;
DROP POLICY IF EXISTS "client can read analytics branches" ON public.analytics_branches;

DROP POLICY IF EXISTS "client can read analytics_categories" ON public.analytics_categories;
DROP POLICY IF EXISTS "client can read analytics categories" ON public.analytics_categories;

DROP POLICY IF EXISTS "client can read analytics_periods" ON public.analytics_periods;
DROP POLICY IF EXISTS "client can read analytics periods" ON public.analytics_periods;

-- Regression guard: assert no unscoped client policy survives on the 6 tables.
-- A policy is "unscoped" when its name lacks 'scoped' yet targets role client.
DO $$
DECLARE
  bad INTEGER;
BEGIN
  SELECT count(*) INTO bad
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'analytics_fact_sales',
      'analytics_fact_inventory',
      'analytics_suppliers',
      'analytics_branches',
      'analytics_categories',
      'analytics_periods'
    )
    AND policyname ILIKE '%client%'
    AND policyname NOT ILIKE '%scoped%';

  IF bad > 0 THEN
    RAISE EXCEPTION 'Unscoped client policy(ies) still present: %', bad;
  END IF;
END $$;

COMMIT;