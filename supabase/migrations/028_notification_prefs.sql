-- Add notification preferences JSONB column to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{"deliverable_review":true,"invoice_overdue":true,"milestone_reached":true,"new_message":true}'::jsonb;
