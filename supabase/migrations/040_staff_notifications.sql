-- ═══════════════════════════════════════════════════════════════
-- Migration 040: Staff notifications support
-- ═══════════════════════════════════════════════════════════════
-- Adds user_id column to notifications table for staff-directed
-- notifications (leads, task assignments, project updates).
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- Add user_id column (nullable — staff notifications use this, client notifications use client_id)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Expand type CHECK to include staff-relevant types
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'deliverable','invoice','message','booking','milestone','general',
      'new_lead','task_assigned','project_update','payment_received'
    ));

-- Index for staff queries
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications(user_id, read, created_at DESC);

-- Drop old client-only policies (they conflict with polymorphic design)
DROP POLICY IF EXISTS "client can read their notifications" ON public.notifications;
DROP POLICY IF EXISTS "client can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin can insert notifications" ON public.notifications;

-- New RLS: client reads own notifications
CREATE POLICY "client read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- New RLS: client updates own notifications
CREATE POLICY "client update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- New RLS: staff reads own notifications
CREATE POLICY "staff read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- New RLS: staff updates own notifications
CREATE POLICY "staff update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- New RLS: anyone with admin role can insert
CREATE POLICY "admin can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

COMMIT;
