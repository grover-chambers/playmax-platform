-- Realtime: publish census tables to the supabase_realtime publication.
-- Without this, postgres_changes subscriptions never fire and the War Room
-- falls back to 30s polling (no live pushes for outlets/retailers/etc).
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.rep_locations,
  public.visits,
  public.consumer_intercepts,
  public.census_batches,
  public.reps,
  public.outlets,
  public.retailers;