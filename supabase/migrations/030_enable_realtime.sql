-- Enable Realtime for portal tables
-- This allows the frontend to subscribe to live changes

-- Drop existing publication if it exists to recreate it
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create publication with all portal tables included
CREATE PUBLICATION supabase_realtime FOR TABLE
  public.notifications,
  public.messages,
  public.client_activity_log;
